import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ReservationModule } from './reservation/reservation.module';

@Module({
  imports: [ClientsModule.register([
    { name: "RESERVATION_SERVICE", transport: Transport.TCP },
  ]),
  ConfigModule.forRoot({
    envFilePath: [".env.dev", ".env"],
  }),
  ReservationModule,
  TypeOrmModule.forRoot({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    autoLoadEntities: true,
    synchronize: true,
  }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
