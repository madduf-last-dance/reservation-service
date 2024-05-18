import { Status } from "../entities/status.enum";

export class ReservationDto {
  accommodationId: number;

  guestId: number;

  startDate: Date;

  endDate: Date;

  guestNumber: number;

  status: Status;
}
