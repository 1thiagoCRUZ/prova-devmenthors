import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuditExceptionFilter } from './audit/audit-exception.filter';
import { AuditModule } from './audit/audit.module';
import { AppThrottlerGuard } from './common/throttler/app-throttler.guard';
import { validateEnv } from './config/env.validation';
import { ExamsModule } from './exams/exams.module';
import { GradingModule } from './grading/grading.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        skipIf: () => config.get('NODE_ENV') === 'test',
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AdminAuthModule,
    ExamsModule,
    QuestionsModule,
    AssignmentsModule,
    GradingModule,
    SubmissionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_FILTER, useClass: AuditExceptionFilter },
  ],
})
export class AppModule {}
