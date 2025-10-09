import { Module } from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { ReservationController } from "./reservation.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { Reservation } from "./entities/reservation.entity";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "ACCOMMODATION_SERVICE",
        transport: Transport.TCP,
        options: {
          host: "localhost",
          port: 1312,
        },
      },
    ]),
    TypeOrmModule.forFeature([Reservation]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
