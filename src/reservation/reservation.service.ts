import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ReservationDto } from "./dto/reservation.dto";
import { UpdateReservationDto } from "./dto/update-reservation.dto";
import { Reservation } from "./entities/reservation.entity";
import { Between, LessThan, MoreThan, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Status } from "./entities/status.enum";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @Inject("ACCOMMODATION_SERVICE")
    private readonly accommodationClient: ClientProxy,
  ) {}

  async create(reservationDto: ReservationDto): Promise<Reservation> {
    const reservation = this.reservationRepository.create(reservationDto);
    return await this.reservationRepository.save(reservation);
  }

  async findAll(): Promise<Reservation[]> {
    return await this.reservationRepository.find();
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
    const reservations = await this.reservationRepository.find({
      where: {
        startDate: LessThan(dto.endDate),
        endDate: MoreThan(dto.startDate),
        accommodationId: dto.accommodationId,
        status: Status.ACCEPTED,
      },
    });
    //console.log(reservations)
    if(reservations.length > 0){
      return "Reservation failed there are reservations in that time period.";
    }
    const aDto = {
      accommodationId: dto.accommodationId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    }
    const bool = await this.accommodationClient.send<string>("checkAvailability", aDto).toPromise();
    console.log(bool)

    if(bool){
      dto.status = Status.PENDING;
      const reservation = this.create(dto); 
      return reservation
    }
    else {
      return "Reservation failed, accommodation is not avaliable at these dates.";
    }
      
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
}
