import { Module } from "@nestjs/common";
import { SeedService } from "./seed.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Reservation } from "src/reservation/entities/reservation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Reservation])],
  providers: [SeedService],
})
export class SeedModule {}
