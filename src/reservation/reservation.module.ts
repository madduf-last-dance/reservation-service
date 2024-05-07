import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { Reservation } from './entities/reservation.entity';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "RESERVATION_SERVICE",
        transport: Transport.TCP,
        options: {
          port: 1315,
        },
      },
    ]),
    TypeOrmModule.forFeature([Reservation]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
