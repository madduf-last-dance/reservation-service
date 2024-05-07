import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Controller()
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @MessagePattern('createReservation')
  create(@Payload() createReservationDto: CreateReservationDto) {
    return this.reservationService.create(createReservationDto);
  }

  @MessagePattern('findAllReservation')
  findAll() {
    return this.reservationService.findAll();
  }

  @MessagePattern('findOneReservation')
  findOne(@Payload() id: number) {
    return this.reservationService.findOne(id);
  }

  @MessagePattern('updateReservation')
  update(@Payload() updateReservationDto: UpdateReservationDto) {
    return this.reservationService.update(updateReservationDto.id, updateReservationDto);
  }

  @MessagePattern('removeReservation')
  remove(@Payload() id: number) {
    return this.reservationService.remove(id);
  }
}
