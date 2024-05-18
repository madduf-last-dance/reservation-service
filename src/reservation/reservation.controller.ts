import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ReservationService } from "./reservation.service";
import { ReservationDto } from "./dto/reservation.dto";
import { Reservation } from "./entities/reservation.entity";

@Controller()
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @MessagePattern("createReservation")
  create(@Payload() createReservationDto: ReservationDto) {
    return this.reservationService.create(createReservationDto);
  }

  @MessagePattern("findAllReservation")
  findAll() {
    return this.reservationService.findAll();
  }

  @MessagePattern("findOneReservation")
  findOne(@Payload() id: number) {
    return this.reservationService.findOne(id);
  }

  @MessagePattern("updateReservation")
  update(@Payload() updateReservation: Reservation) {
    return this.reservationService.update(
      updateReservation.id,
      updateReservation,
    );
  }

  @MessagePattern("removeReservation")
  remove(@Payload() id: number) {
    return this.reservationService.remove(id);
  }

  @MessagePattern("reserve")
  reserve(@Payload() rDto: ReservationDto): Promise<Reservation> {
    return this.reservationService.reserve(rDto);
  }

  @MessagePattern("cancelReservationPending")
  cancelReservationPending(@Payload() payload: { reservationId: number }) {
    console.log("Number:", payload.reservationId); // console.log("Number:", reservationId) Print is: 'Number: { reservationId: 12 }'
    return this.reservationService.cancelReservationPending(
      payload.reservationId,
    );
  }

  @MessagePattern("cancelReservationAccepted")
  cancelReservationAccepted(@Payload() payload: { reservationId: number }) {
    console.log("Number:", payload.reservationId); // console.log("Number:", reservationId) Print is: 'Number: { reservationId: 12 }'
    return this.reservationService.cancelReservationAccepted(
      payload.reservationId,
    );
  }
}


