import { IngestionJob, JobStatus } from '@research-qna/types';
import crypto from 'crypto';

class JobManager {
  private jobs = new Map<string, IngestionJob>();

  createJob(paperId: string): IngestionJob {
    const jobId = `job-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const job: IngestionJob = {
      jobId,
      paperId,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId: string): IngestionJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<Omit<IngestionJob, 'jobId' | 'createdAt'>>): IngestionJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    const updatedJob: IngestionJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }
}

export const jobManager = new JobManager();
