export function createJobStore() {
  const jobs = new Map();

  function createJob({ id, url, mode, quality, bitrate, title, platform }) {
    const job = {
      id,
      url,
      mode,
      quality: quality ?? null,
      bitrate: bitrate ?? null,
      title,
      platform,
      status: 'queued',
      progress: 0,
      historyId: null,
      error: null,
    };
    jobs.set(id, job);
    return job;
  }

  function getJob(id) {
    return jobs.get(id) ?? null;
  }

  function nextQueued() {
    for (const job of jobs.values()) {
      if (job.status === 'queued') return job;
    }
    return null;
  }

  function markDownloading(id) {
    const job = jobs.get(id);
    if (job) job.status = 'downloading';
  }

  function updateProgress(id, progress) {
    const job = jobs.get(id);
    if (job) job.progress = progress;
  }

  function completeJob(id, historyId) {
    const job = jobs.get(id);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.historyId = historyId;
    }
  }

  function failJob(id, error) {
    const job = jobs.get(id);
    if (job) {
      job.status = 'failed';
      job.error = error;
    }
  }

  return { createJob, getJob, nextQueued, markDownloading, updateProgress, completeJob, failJob };
}
