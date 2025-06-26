import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ReservationDto } from "./dto/reservation.dto";
import { UpdateReservationDto } from "./dto/update-reservation.dto";
import { Reservation } from "./entities/reservation.entity";
import { Between, LessThan, MoreThan, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Status } from "./entities/status.enum";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @Inject("ACCOMMODATION_SERVICE")
    private readonly accommodationClient: ClientProxy,
  ) { }

  async create(reservationDto: ReservationDto): Promise<Reservation> {
    reservationDto.status = Status.PENDING;
    const isOk = this.checkReservation(reservationDto);
    if (!isOk) {
      return null;
    }
    const accommodation = await lastValueFrom(this.accommodationClient.send<any>("findOneAccommodation", reservationDto.accommodationId));
    if (!accommodation) {
      return null;
    }
    if (accommodation.isAutomatic) {
      reservationDto.status = Status.ACCEPTED;
    }
    const reservation = this.reservationRepository.create(reservationDto);
    return await this.reservationRepository.save(reservation);
  }

  async findAll(): Promise<Reservation[]> {
    return await this.reservationRepository.find();
  }
  async findAllByUser(id: number): Promise<Reservation[]> {
    return await this.reservationRepository.find(
      { where: { guestId: id } }
    );
  }

  async findAllByAccommodation(id: number): Promise<Reservation[]> {
    return await this.reservationRepository.find(
      { where: { accommodationId: id } }
    );
  }
  async findOne(id: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    return reservation;
  }

  async update(
    id: number,
    updatedReservation: Reservation,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id);
    this.reservationRepository.merge(reservation, updatedReservation);
    return await this.reservationRepository.save(reservation);
  }

  async remove(id: number): Promise<void> {
    await this.reservationRepository.delete({ id: id });
  }

  async reserve(dto: ReservationDto): Promise<any> {
    this.checkReservation(dto);
    const reservation = this.create(dto);
    return reservation;
  }

  async cancelReservationPending(reservationId: number) {
    const reservation = await this.reservationRepository.findOne({
      where: {
        id: reservationId,
        status: Status.PENDING,
      },
    });
    if (reservation) {
      this.remove(reservation.id);
      return "Successfully canceled reservation.";
    }
    return "Reservation with " + reservationId + " doesn't exist.";
  }

  async cancelReservationAccepted(reservationId: number) {
    const reservation = await this.reservationRepository.findOne({
      where: {
        id: reservationId,
        status: Status.ACCEPTED,
      },
    });
    if (reservation) {
      this.remove(reservation.id);
    }
  }

  async confirmReservation(rDto: ReservationDto) {
    const reservation = await this.reservationRepository.findOne({
      where: {
        accommodationId: rDto.accommodationId,
        startDate: rDto.startDate,
        endDate: rDto.endDate,
        status: Status.PENDING,
      },
    });
    if (reservation) {
      reservation.status = Status.ACCEPTED;
      this.update(reservation.id, reservation);
    }

    // Accepted reservations in that timeframe
    // const reservations = await this.reservationRepository.find({
    //   where: {
    //     accommodationId: rDto.accommodationId,
    //     startDate: Between(startDate, endDate),
    //     endDate: Between(startDate, endDate),
    //     status: Status.ACCEPTED,
    //   },
    // });
    // console.log("Input DTO:", rDto);
    // console.log("Converted Dates:", startDate, endDate);
    // console.log("Retrieved Reservations:", reservations);

    // if (reservations.length > 0){ // There are reservations in that time period
    //   return "Cannot reserve, date is taken.";
    // }
    rDto.status = Status.PENDING;
    this.create(rDto);
    return "Successfully created reservation.";
  }
  async hasFutureReservations(guestId: number) {
    const reservations = await this.reservationRepository.find({
      where: {
        guestId: guestId,
        status: Status.ACCEPTED,
        startDate: MoreThan(new Date()),
      },
    });
    return reservations.length > 0;
  }

  async hasFutureReservationsHost(hostId: number) {
    const accommodations = await lastValueFrom(
      this.accommodationClient.send<any>("findAllAccommodationsHost", hostId),
    );
    for (const accommodation of accommodations) {
      const reservations = await this.reservationRepository.find({
        where: {
          accommodationId: accommodation.id,
          status: Status.ACCEPTED,
          startDate: MoreThan(new Date()),
        },
      });
      if (reservations.length > 0) {
        return true;
      }
    }
    return false;
  }

  async checkReservation(dto: any) {
    const accommodation = await lastValueFrom(this.accommodationClient.send<any>("findOneAccommodation", dto.accommodationId));
    if (!accommodation) {
      return false;
      // throw new NotFoundException(`Accommodation with ID ${dto.accommodationId} not found`);
    }
    const reservations = await this.reservationRepository.find({
      where: {
        startDate: LessThan(dto.endDate),
        endDate: MoreThan(dto.startDate),
        accommodationId: dto.accommodationId,
        status: Status.ACCEPTED,
      },
    });
    if (reservations.length > 0) {
      return false;
    }
    const aDto = {
      accommodationId: dto.accommodationId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };
    const bool = await this.accommodationClient
      .send<any>("checkAvailability", aDto).toPromise();

    if (!bool) {
      return false;
    }
  }

  async findAllGuestAndAccepted(guestId: number, accommodationId: number) {
    const accommodation = await lastValueFrom(this.accommodationClient.send<any>("findOneAccommodation", accommodationId));
    if (!accommodation) {
      return null;
    }
    const guestPendingReservations = await this.reservationRepository.find(
      { where: { guestId: guestId, accommodationId: accommodationId, status: Status.PENDING } }
    );
    const acceptedReservations = await this.reservationRepository.find(
      { where: { accommodationId: accommodationId, status: Status.ACCEPTED } }
    );
    return [...acceptedReservations, ...guestPendingReservations];
  }

  async acceptReservation(reservationId: number) {
    const reservation = await this.reservationRepository.findOne({
      where: {
        id: reservationId,
        status: Status.PENDING,
      },
    });
    if (reservation) {
      reservation.status = Status.ACCEPTED;
      return await this.reservationRepository.save(reservation);
    }
  }
}
