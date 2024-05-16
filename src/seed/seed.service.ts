import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Reservation } from "src/reservation/entities/reservation.entity";
import { Status } from "src/reservation/entities/status.enum";
import { Repository } from "typeorm";

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async seed() {
    const checkedReservations = await this.reservationRepository.find();
    //console.log(checkedReservations);
    if (checkedReservations.length !== 0) {
      return;
    }
    //console.log("reservations");

    const reservations: Partial<Reservation>[] = [
      {
        accommodationId: 1,
        status: Status.PENDING,
        startDate: new Date(2023, 11, 12),
        endDate: new Date(2023, 11, 19),
        guestId: 1,
        guestNumber: 3,
      },
      {
        accommodationId: 1,
        status: Status.ACCEPTED,
        startDate: new Date(2024, 1, 12),
        endDate: new Date(2024, 2, 12),
        guestId: 1,
        guestNumber: 5,
      },
      {
        accommodationId: 1,
        status: Status.ACCEPTED,
        startDate: new Date(2024, 11, 20),
        endDate: new Date(2024, 11, 25),
        guestId: 1,
        guestNumber: 6,
      },
    ];
    await this.reservationRepository.save(reservations);
  }
}
