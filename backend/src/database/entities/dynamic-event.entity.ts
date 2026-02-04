import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Event types categorized by impact area
 */
export enum EventType {
  // Business events
  MARKET_OPPORTUNITY = 'MARKET_OPPORTUNITY',
  COMPETITOR_ACTION = 'COMPETITOR_ACTION',
  MEDIA_COVERAGE = 'MEDIA_COVERAGE',
  PARTNERSHIP_OFFER = 'PARTNERSHIP_OFFER',

  // Technical events
  INFRASTRUCTURE_ISSUE = 'INFRASTRUCTURE_ISSUE',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  PERFORMANCE_ISSUE = 'PERFORMANCE_ISSUE',
  DATA_LOSS = 'DATA_LOSS',

  // Market events
  ECONOMIC_CHANGE = 'ECONOMIC_CHANGE',
  REGULATORY_CHANGE = 'REGULATORY_CHANGE',
  INVESTOR_INTEREST = 'INVESTOR_INTEREST',

  // Team events
  KEY_HIRE = 'KEY_HIRE',
  TEAM_CONFLICT = 'TEAM_CONFLICT',
  TALENT_LOSS = 'TALENT_LOSS',
}

/**
 * Event severity levels
 */
export enum EventSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  POSITIVE = 'POSITIVE',
}

/**
 * DynamicEvent Entity
 * Stores dynamic random events loaded from JSON files
 */
@Entity('dynamic_events')
export class DynamicEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  eventId: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  eventType: EventType;

  @Column({
    type: 'varchar',
    length: 20,
  })
  severity: EventSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Trigger conditions stored as JSON
  @Column({ type: 'simple-json', nullable: true })
  triggerCondition: {
    minTurn?: number;
    maxTurn?: number;
    minUsers?: number;
    maxUsers?: number;
    minCash?: number;
    maxCash?: number;
    minTrust?: number;
    maxTrust?: number;
    requiredInfra?: string[];
    excludedInfra?: string[];
    minInfraCount?: number;
    maxInfraCount?: number;
    requiredStaff?: string[];
    minStaffCount?: number;
    capacityExceeded?: boolean;
    investmentFailed?: boolean;
    multiChoiceEnabled?: boolean;
    difficulties?: string[];
    probability?: number;
    cooldownTurns?: number;
  };

  // Event choices stored as JSON
  @Column({ type: 'simple-json' })
  choices: Array<{
    choiceId: string;
    text: string;
    description?: string;
    effect: {
      usersDelta?: number;
      usersMultiplier?: number;
      cashDelta?: number;
      cashMultiplier?: number;
      trustDelta?: number;
      trustMultiplier?: number;
      addInfrastructure?: string[];
      removeInfrastructure?: string[];
      maxCapacityDelta?: number;
      maxCapacityMultiplier?: number;
      userAcquisitionMultiplierDelta?: number;
      trustMultiplierDelta?: number;
      forceNextTurn?: number;
      endGame?: boolean;
      setStatus?: string;
    };
    cashCost?: number;
    trustCost?: number;
    requiredCash?: number;
    requiredTrust?: number;
    requiredInfra?: string[];
    requiredStaff?: string[];
  }>;

  // Auto effect if no choices
  @Column({ type: 'simple-json', nullable: true })
  autoEffect?: {
    usersDelta?: number;
    usersMultiplier?: number;
    cashDelta?: number;
    cashMultiplier?: number;
    trustDelta?: number;
    trustMultiplier?: number;
    addInfrastructure?: string[];
    removeInfrastructure?: string[];
    maxCapacityDelta?: number;
    maxCapacityMultiplier?: number;
    userAcquisitionMultiplierDelta?: number;
    trustMultiplierDelta?: number;
    forceNextTurn?: number;
    endGame?: boolean;
    setStatus?: string;
  };

  @Column({ type: 'boolean', default: false })
  isOneTime: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'simple-json', default: '[]' })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
