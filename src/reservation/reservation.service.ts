import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ReservationDto } from "./dto/reservation.dto";
import { UpdateReservationDto } from "./dto/update-reservation.dto";
import { Reservation } from "./entities/reservation.entity";
import { Between, LessThan, MoreThan, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { Status } from "./entities/status.enum";
import { MoreThanOrEqual, In } from 'typeorm';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @Inject("ACCOMMODATION_SERVICE")
    private readonly accommodationClient: ClientProxy,
  ) {}

  async create(reservationDto: ReservationDto): Promise<Reservation> {
    reservationDto.status = Status.PENDING;
    const isOk = await this.checkReservation(reservationDto);
    if (!isOk) {
      return null;
    }
    const accommodation = await lastValueFrom(
      this.accommodationClient.send<any>(
        "findOneAccommodation",
        reservationDto.accommodationId,
      ),
    );
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
    return await this.reservationRepository.find({ where: { guestId: id } });
  }

  async findAllByAccommodation(id: number): Promise<Reservation[]> {
    return await this.reservationRepository.find({
      where: { accommodationId: id },
    });
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
        const now = new Date();
        const diffInMs = Math.abs(reservation.startDate.getTime() - now.getTime());
        const oneDayInMs = 24 * 60 * 60 * 1000; // milliseconds in one day
        if(diffInMs > oneDayInMs) {
          this.remove(reservation.id);
          return "Successfully canceled reservation.";

        }
        return "Cannot remove reservation within one day.";
    }
    return "Reservation with " + reservationId + " doesn't exist.";
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

    rDto.status = Status.PENDING;
    this.create(rDto);
    return "Successfully created reservation.";
  }

  // Guest: cannot delete if they have accepted or pending reservations that are ongoing or in the future
  async hasFutureReservationsGuest(guestId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations = await this.reservationRepository.find({
      where: {
        guestId,
        status: In([Status.ACCEPTED, Status.PENDING]),
        endDate: MoreThanOrEqual(today), // check if reservation ends today or later
      },
    });
    console.log("N of reservations for Guest %s", reservations.length)
    return reservations.length > 0;
  }

  // Host: cannot delete if any of their accommodations have accepted or pending reservations that are ongoing or in the future
  async hasFutureReservationsHost(hostId: number) {
    const accommodations = await lastValueFrom(
      this.accommodationClient.send<any>('findAllAccommodationsHost', hostId),
    );

    if (!accommodations || accommodations.length === 0) {
      return false;
    }

    const accIds = accommodations.map((a) => a.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations = await this.reservationRepository.find({
      where: {
        accommodationId: In(accIds),
        status: In([Status.ACCEPTED, Status.PENDING]),
        endDate: MoreThanOrEqual(today), // check if reservation ends today or later
      },
    });
    console.log("N of reservations for Host's accommodations %s", reservations.length)
    return reservations.length > 0;
  }


  async checkReservation(dto: any) {
    const accommodation = await lastValueFrom(
      this.accommodationClient.send<any>(
        "findOneAccommodation",
        dto.accommodationId,
      ),
    );
    if (!accommodation) {
      return false;
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
    const hasAvailability = await this.accommodationClient
      .send<any>("checkAvailability", aDto)
      .toPromise();
    console.log(hasAvailability + " _ hasAvailability");

    return hasAvailability;
  }

  async findAllGuestAndAccepted(guestId: number, accommodationId: number) {
    const accommodation = await lastValueFrom(
      this.accommodationClient.send<any>(
        "findOneAccommodation",
        accommodationId,
      ),
    );
    if (!accommodation) {
      return null;
    }
    const guestPendingReservations = await this.reservationRepository.find({
      where: {
        guestId: guestId,
        accommodationId: accommodationId,
        status: Status.PENDING,
      },
    });
    const acceptedReservations = await this.reservationRepository.find({
      where: { accommodationId: accommodationId, status: Status.ACCEPTED },
    });
    return [...acceptedReservations, ...guestPendingReservations];
  }

 async acceptReservation(reservationId: number): Promise<Reservation | null> {
    return await this.reservationRepository.manager.transaction(
      async (manager) => {
        console.log(reservationId)
        // 1) Lock the reservation row to prevent races (pessimistic write)
         const reservation = await manager.findOne(Reservation, {
          where: { id: reservationId, status: Status.PENDING },
        });
        console.log(reservation)
        if (!reservation) {
          // Not found or not pending
          return null;
        }

        // 2) Accept the selected reservation
        reservation.status = Status.ACCEPTED;
        await manager.save(Reservation, reservation);

        // 3) Decline all other pending reservations for same accommodation that overlap
        // Overlap condition (inclusive): NOT (other.endDate < res.startDate OR other.startDate > res.endDate)
        await manager
          .createQueryBuilder()
          .update(Reservation)
          .set({ status: Status.DECLINED })
          .where("accommodationId = :accId", {
            accId: reservation.accommodationId,
          })
          .andWhere("status = :pending", { pending: Status.PENDING })
          .andWhere("id != :id", { id: reservation.id })
          .andWhere(
            "NOT (endDate < :startDate OR startDate > :endDate)",
            {
              startDate: reservation.startDate,
              endDate: reservation.endDate,
            }
          )
          .execute();

        // 4) return the accepted reservation
        return reservation;
      }
    );
  }

  async canRateAccommodation(
    @Payload() data: { guestId: number; accommodationId: number },
  ): Promise<boolean> {
    const { guestId, accommodationId } = data;

    // Guest must have at least 1 past ACCEPTED reservation for that accommodation
    const reservations = await this.reservationRepository.find({
      where: {
        guestId,
        accommodationId,
        status: Status.ACCEPTED,
        endDate: LessThan(new Date()), // already finished
      },
    });

    return reservations.length > 0;
  }

  async canRateHost(
    @Payload() data: { guestId: number; hostId: number },
  ): Promise<boolean> {
    const { guestId, hostId } = data;

    // Find all accommodations owned by this host
    const accommodations = await this.accommodationClient
      .send<any[]>("findAllAccommodationsHost", hostId)
      .toPromise();

    if (!accommodations || accommodations.length === 0) return false;

    // Check if guest has at least 1 past ACCEPTED reservation in any of them
    for (const acc of accommodations) {
      const reservations = await this.reservationRepository.find({
        where: {
          guestId,
          accommodationId: acc.id,
          status: Status.ACCEPTED,
          endDate: LessThan(new Date()), // stay must be completed
        },
      });
      if (reservations.length > 0) {
        return true;
      }
    }

    return false;
  }
}
