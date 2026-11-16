import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stock_reservation')
export class StockReservationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'service_order_id' })
  serviceOrderId!: string;

  @Column()
  status!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items!: unknown;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  consumptions!: unknown;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
