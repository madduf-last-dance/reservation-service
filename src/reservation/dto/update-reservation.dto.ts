import { PartialType } from '@nestjs/mapped-types';
import { ReservationDto } from './reservation.dto';

export class UpdateReservationDto extends PartialType(ReservationDto) {
  id: number;
}
