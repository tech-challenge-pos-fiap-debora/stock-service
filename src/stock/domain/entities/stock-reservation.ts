import { randomUUID } from 'crypto';
import { StockReservationStatus } from './stock-reservation-status';

export type ReservationItem = {
  productCode: string;
  quantity: number;
};

export type ReservationConsumption = {
  productCode: string;
  batchId: string;
  quantityConsumed: number;
  salePrice: number;
};

export type StockReservationProps = {
  serviceOrderId: string;
  status: StockReservationStatus;
  items: ReservationItem[];
  consumptions: ReservationConsumption[];
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export class StockReservation {
  private constructor(
    private readonly _id: string,
    private props: StockReservationProps,
  ) {}

  static create(input: {
    serviceOrderId: string;
    items: ReservationItem[];
    id?: string;
  }): StockReservation {
    const now = new Date();
    return new StockReservation(input.id ?? randomUUID(), {
      serviceOrderId: input.serviceOrderId,
      status: StockReservationStatus.PENDING,
      items: input.items.map((i) => ({ ...i })),
      consumptions: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: StockReservationProps, id: string): StockReservation {
    return new StockReservation(id, {
      ...props,
      items: props.items.map((i) => ({ ...i })),
      consumptions: props.consumptions.map((c) => ({ ...c })),
    });
  }

  get id() {
    return this._id;
  }
  get serviceOrderId() {
    return this.props.serviceOrderId;
  }
  get status() {
    return this.props.status;
  }
  get items() {
    return this.props.items.map((i) => ({ ...i }));
  }
  get consumptions() {
    return this.props.consumptions.map((c) => ({ ...c }));
  }
  get failureReason() {
    return this.props.failureReason;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  replaceItems(items: ReservationItem[]): void {
    if (
      this.props.status !== StockReservationStatus.PENDING &&
      this.props.status !== StockReservationStatus.FAILED
    ) {
      throw new Error(`Cannot replace items in status ${this.props.status}`);
    }
    this.props.items = items.map((i) => ({ ...i }));
    this.props.status = StockReservationStatus.PENDING;
    this.props.failureReason = undefined;
    this.touch();
  }

  markReserved(consumptions: ReservationConsumption[]): void {
    if (
      this.props.status !== StockReservationStatus.PENDING &&
      this.props.status !== StockReservationStatus.RESERVED
    ) {
      throw new Error(`Cannot reserve in status ${this.props.status}`);
    }
    this.props.consumptions = consumptions.map((c) => ({ ...c }));
    this.props.status = StockReservationStatus.RESERVED;
    this.props.failureReason = undefined;
    this.touch();
  }

  markFailed(reason: string): void {
    this.props.status = StockReservationStatus.FAILED;
    this.props.failureReason = reason;
    this.touch();
  }

  markConfirmed(): void {
    if (this.props.status === StockReservationStatus.CONFIRMED) {
      this.touch();
      return;
    }
    if (this.props.status !== StockReservationStatus.RESERVED) {
      throw new Error(`Cannot confirm in status ${this.props.status}`);
    }
    this.props.status = StockReservationStatus.CONFIRMED;
    this.touch();
  }

  markReleased(): void {
    if (
      this.props.status === StockReservationStatus.RELEASED ||
      this.props.status === StockReservationStatus.CANCELLED
    ) {
      this.touch();
      return;
    }
    this.props.status = StockReservationStatus.RELEASED;
    this.touch();
  }

  markCancelled(): void {
    if (this.props.status === StockReservationStatus.CANCELLED) {
      this.touch();
      return;
    }
    this.props.status = StockReservationStatus.CANCELLED;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
