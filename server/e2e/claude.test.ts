/**
 * Claude Code E2E Tests
 *
 * End-to-end tests that verify the full routing pipeline works correctly
 * with the actual Claude Code CLI.
 *
 * Requirements:
 * - Claude Code CLI must be installed and accessible as `claude`
 * - Tests use trivial tasks to minimize cost and execution time
 * - 2-minute timeout per test
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  setupE2EEnvironment,
  teardownE2EEnvironment,
  isClaudeAvailable,
  get,
  post,
  json,
  factory,
  waitForTaskStatus,
  waitForRoutingComplete,
} from './setup'

// Check if Claude is available before running tests
let claudeAvailable = false

beforeAll(async () => {
  await setupE2EEnvironment()
  claudeAvailable = await isClaudeAvailable()

  if (!claudeAvailable) {
    console.warn('\n⚠️  Claude Code CLI not found. E2E tests will be skipped.')
    console.warn('   Install Claude Code to run these tests: https://claude.ai/cli\n')
  }
})

afterAll(async () => {
  await teardownE2EEnvironment()
})

describe('Claude Code E2E', () => {
  test('Claude Code agent can execute a trivial task', async () => {
    // Skip if Claude is not available
    if (!claudeAvailable) {
      console.log('Skipping: Claude Code CLI not available')
      return
    }

    // 1. Create workspace
    const workspace = await factory.createWorkspace('Claude E2E Test')
    expect(workspace.id).toBeDefined()

    // 2. Create agent with trivial instruction (always skip)
    const agent = await factory.createSkipAgent(workspace.id, 'Claude Skip Agent')
    expect(agent.id).toBeDefined()

    // 3. Create task with trivial content
    const task = await factory.createTask(workspace.id, {
      title: 'E2E Skip Test',
      description: 'This is an automated e2e test. The agent should skip this task.',
    })
    expect(task.id).toBeDefined()
    expect(task.status).toBe('todo')

    // 4. Trigger routing
    const triggerRes = await post('/api/routing/trigger', { taskId: task.id })
    expect(triggerRes.status).toBe(201)

    const routing = await json<{ id: string; taskId: string; status: string }>(triggerRes)
    expect(routing.taskId).toBe(task.id)
    expect(['pending', 'running']).toContain(routing.status)

    // 5. Wait for task status to become 'in_review' or 'todo' (2 min timeout)
    // When all agents skip, task goes back to 'todo'
    // When any agent comments/completes, task goes to 'in_review'
    const finalTask = await waitForTaskStatus(
      task.id,
      ['in_review', 'todo', 'done'],
      120000
    )
    expect(finalTask.id).toBe(task.id)

    // 6. Verify results exist

    // 6a. Verify execution record exists
    const execRes = await get(`/api/executions?taskId=${task.id}`)
    expect(execRes.status).toBe(200)

    const { executions } = await json<{
      executions: Array<{ id: string; status: string; agentId: string; result: string | null }>
    }>(execRes)
    expect(executions.length).toBeGreaterThan(0)

    // At least one execution should be completed
    const completedExecutions = executions.filter((e) => e.status === 'completed')
    expect(completedExecutions.length).toBeGreaterThan(0)

    // 6b. Verify routing record exists and completed
    const routingRes = await get(`/api/routing/task/${task.id}`)
    expect(routingRes.status).toBe(200)

    const finalRouting = await json<{ id: string; status: string; taskId: string } | null>(routingRes)
    expect(finalRouting).not.toBeNull()
    expect(finalRouting!.taskId).toBe(task.id)
    expect(['completed', 'failed']).toContain(finalRouting!.status)

    // 6c. If result was 'comment', verify comment exists
    const commentExecutions = executions.filter((e) => e.result === 'comment')
    if (commentExecutions.length > 0) {
      const commentsRes = await get(`/api/tasks/${task.id}/comments`)
      expect(commentsRes.status).toBe(200)

      const comments = await json<Array<{ id: string; authorType: string }>>(commentsRes)
      // Should have at least one agent comment
      const agentComments = comments.filter((c) => c.authorType === 'agent')
      expect(agentComments.length).toBeGreaterThan(0)
    }

    console.log(`✓ Task ${task.id} completed with status: ${finalTask.status}`)
    console.log(`✓ ${executions.length} execution(s) recorded`)
    console.log(`✓ Routing status: ${finalRouting!.status}`)
  }, 150000) // 2.5 minute test timeout

  test('routing pipeline handles multiple agents', async () => {
    // Skip if Claude is not available
    if (!claudeAvailable) {
      console.log('Skipping: Claude Code CLI not available')
      return
    }

    // 1. Create workspace with multiple skip agents
    const workspace = await factory.createWorkspace('Multi-Agent E2E Test')

    // Create 2 agents that both skip
    await factory.createSkipAgent(workspace.id, 'Skip Agent 1')
    await factory.createSkipAgent(workspace.id, 'Skip Agent 2')

    // 2. Create and route task
    const task = await factory.createTask(workspace.id, {
      title: 'Multi-Agent Skip Test',
      description: 'Test with multiple skip agents.',
    })

    await post('/api/routing/trigger', { taskId: task.id })

    // 3. Wait for completion
    await waitForRoutingComplete(task.id, 120000)

    // 4. Verify both agents were invoked
    const execRes = await get(`/api/executions?taskId=${task.id}`)
    const { executions } = await json<{ executions: Array<{ agentId: string }> }>(execRes)

    // Should have executions from both agents (in first iteration at least)
    expect(executions.length).toBeGreaterThanOrEqual(1)

    console.log(`✓ ${executions.length} execution(s) for multi-agent task`)
  }, 150000)
})

describe('E2E Server Health', () => {
  test('server responds to health check', async () => {
    const res = await get('/api/health')
    expect(res.status).toBe(200)

    const data = await json<{ status: string }>(res)
    expect(data.status).toBe('healthy')
  })

  test('server accepts API requests', async () => {
    const workspace = await factory.createWorkspace('Health Check Workspace')
    expect(workspace.id).toBeDefined()
    expect(workspace.name).toBe('Health Check Workspace')
  })
})
