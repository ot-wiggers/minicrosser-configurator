import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Run pipeline processing daily at 09:00 UTC
crons.daily(
  'pipeline-follow-up',
  { hourUTC: 9, minuteUTC: 0 },
  internal.pipeline.processFollowUps,
)

export default crons
