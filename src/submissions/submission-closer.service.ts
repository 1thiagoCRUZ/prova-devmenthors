import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubmissionsService } from './submissions.service';

/** Fecha submissões vencidas mesmo que o aluno nunca mais faça request. */
@Injectable()
export class SubmissionCloserService {
  private readonly logger = new Logger(SubmissionCloserService.name);

  constructor(private readonly submissions: SubmissionsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpired() {
    const ids = await this.submissions.findExpiredInProgress();
    let closed = 0;
    for (const id of ids) {
      try {
        if (await this.submissions.autoClose(id)) closed++;
      } catch (err) {
        this.logger.error(
          JSON.stringify({ type: 'auto_close_failed', submissionId: id, error: (err as Error).message }),
        );
      }
    }
    if (closed > 0) this.logger.log(JSON.stringify({ type: 'auto_close', closed }));
  }
}
