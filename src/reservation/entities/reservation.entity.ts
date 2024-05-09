import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
import { Status } from "./status.enum";
  
  @Entity()
  export class Reservation {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    accommodationId: number;

    @Column({ nullable: false })
    guestId: number;

    @Column()
    startDate: Date;

    @Column()
    endDate: Date;
  
    @Column()
    guestNumber: number;

    @Column()
    status: Status;
  
  }
  