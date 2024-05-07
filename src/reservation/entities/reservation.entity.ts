import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
  
  @Entity()
  export class Reservation {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    accommodationId: number;

    @Column()
    startDate: Date;

    @Column()
    endDate: Date;
  
    @Column()
    guestNumber: number;

    @Column()
    accepted: boolean;
  
  }
  