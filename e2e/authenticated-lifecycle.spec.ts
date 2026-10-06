import { expect, test, type Browser } from "@playwright/test";
import { loginAs } from "./support/auth";
import { readAuthenticatedE2EEnv } from "./support/authenticated-env";
import {
  cleanupLifecycleFixture,
  countEngagementFeedback,
  createAcceptedEngagementFixture,
  createAdminClient,
  createProviderPendingFixture,
  ensureAuthenticatedAccounts,
  readCandidate,
  readEngagement,
  readEngagementFeedback,
  readRequest,
  signInClient,
} from "./support/authenticated-fixtures";

async function newAuthenticatedPage(
  browser: Browser,
  credentials: {
    email: string;
    password: string;
  },
  next: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await loginAs(page, credentials, next);

  return {
    context,
    page,
  };
}

async function clickAdminMarkContacted(
  browser: Browser,
  credentials: {
    email: string;
    password: string;
  },
  requestId: string,
) {
  const session = await newAuthenticatedPage(
    browser,
    credentials,
    `/admin/requests/${requestId}`,
  );

  await session.page.getByRole("button", { name: "Mark contacted" }).click();
  await expect(session.page.getByText("Candidate marked contacted.")).toBeVisible();
  await session.context.close();
}

async function clickAdminPresentCandidate(
  browser: Browser,
  credentials: {
    email: string;
    password: string;
  },
  requestId: string,
) {
  const session = await newAuthenticatedPage(
    browser,
    credentials,
    `/admin/requests/${requestId}`,
  );

  await session.page.getByLabel("Shortlist rank").selectOption("1");
  await session.page.getByRole("button", { name: "Present candidate" }).click();
  await expect(session.page.getByText("Request update saved.")).toBeVisible();
  await session.context.close();
}

async function clickAdminCreateEngagement(
  browser: Browser,
  credentials: {
    email: string;
    password: string;
  },
  requestId: string,
) {
  const session = await newAuthenticatedPage(
    browser,
    credentials,
    `/admin/requests/${requestId}`,
  );

  await expect(
    session.page.getByRole("button", { name: "Create engagement" }),
  ).toBeVisible();
  await session.page.getByRole("button", { name: "Create engagement" }).click();
  await expect(session.page.getByText("Project engagement created.")).toBeVisible();
  await session.context.close();
}

function expectAuthorizationFailure(error: { message?: string } | null) {
  expect(error?.message).toContain("not_authorized");
}

test.describe("authenticated lifecycle regression", () => {
  const env = readAuthenticatedE2EEnv();
  const adminClient = createAdminClient(env);
  let accounts: Awaited<ReturnType<typeof ensureAuthenticatedAccounts>>;
  let adminRpcClient: Awaited<ReturnType<typeof signInClient>>;

  test.beforeAll(async () => {
    accounts = await ensureAuthenticatedAccounts(env, adminClient);
    adminRpcClient = await signInClient(
      env,
      accounts.admin.email,
      accounts.admin.password,
    );
  });

  test("runs the accepted lifecycle from provider response through completion and feedback", async ({
    browser,
  }) => {
    const fixture = await createProviderPendingFixture(adminClient, accounts);

    try {
      const studentClient = await signInClient(
        env,
        accounts.student.email,
        accounts.student.password,
      );
      const { error: wrongRoleProviderResponse } = await studentClient.rpc(
        "respond_to_my_request_candidate",
        {
          p_decline_reason: null,
          p_request_candidate_id: fixture.candidateId,
          p_response: "interested",
        },
      );

      expect(wrongRoleProviderResponse).not.toBeNull();

      const providerSession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.provider.email,
          password: accounts.provider.password,
        },
        `/app/provider/${fixture.providerApplicationId}`,
      );

      await expect(
        providerSession.page.getByRole("button", { name: "Interested" }),
      ).toHaveCount(0);
      await expect(
        providerSession.page.getByRole("button", { name: "Decline" }),
      ).toHaveCount(0);

      await clickAdminMarkContacted(
        browser,
        {
          email: accounts.admin.email,
          password: accounts.admin.password,
        },
        fixture.requestId,
      );
      await providerSession.page.reload();
      await expect(
        providerSession.page.getByRole("button", { name: "Interested" }),
      ).toBeVisible();
      await expect(
        providerSession.page.getByRole("button", { name: "Decline" }),
      ).toBeVisible();
      await providerSession.page.getByRole("button", { name: "Interested" }).click();
      await expect(providerSession.page.getByText("Your response was saved.")).toBeVisible();
      await expect(
        providerSession.page.getByRole("button", { name: "Interested" }),
      ).toHaveCount(0);
      await expect(
        providerSession.page.getByRole("button", { name: "Decline" }),
      ).toHaveCount(0);
      await providerSession.context.close();

      await expect
        .poll(async () => (await readCandidate(adminClient, fixture.candidateId)).provider_response_status)
        .toBe("interested");

      await clickAdminPresentCandidate(
        browser,
        {
          email: accounts.admin.email,
          password: accounts.admin.password,
        },
        fixture.requestId,
      );

      const providerClient = await signInClient(
        env,
        accounts.provider.email,
        accounts.provider.password,
      );
      const { error: wrongRoleDecision } = await providerClient.rpc(
        "decide_on_my_presented_candidate",
        {
          p_decision: "accepted",
          p_decline_reason: null,
          p_request_candidate_id: fixture.candidateId,
        },
      );

      expect(wrongRoleDecision).not.toBeNull();

      const studentDecisionSession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.student.email,
          password: accounts.student.password,
        },
        `/app/requests/${fixture.requestId}`,
      );

      await expect(
        studentDecisionSession.page.getByRole("button", { name: "Accept" }),
      ).toBeVisible();
      await expect(
        studentDecisionSession.page.getByRole("button", { name: "Decline" }),
      ).toBeVisible();
      await studentDecisionSession.page
        .getByRole("button", { name: "Accept" })
        .click();
      await expect(
        studentDecisionSession.page.getByText("Your decision was saved."),
      ).toBeVisible();
      await expect(
        studentDecisionSession.page.getByRole("button", { name: "Accept" }),
      ).toHaveCount(0);
      await expect(
        studentDecisionSession.page.getByRole("button", { name: "Decline" }),
      ).toHaveCount(0);
      await studentDecisionSession.context.close();

      await expect
        .poll(async () => (await readCandidate(adminClient, fixture.candidateId)).student_decision_status)
        .toBe("accepted");
      await expect
        .poll(async () => (await readRequest(adminClient, fixture.requestId)).status)
        .toBe("matched");

      await clickAdminCreateEngagement(
        browser,
        {
          email: accounts.admin.email,
          password: accounts.admin.password,
        },
        fixture.requestId,
      );

      await expect
        .poll(async () => {
          const { data } = await adminClient
            .from("project_engagements")
            .select("id")
            .eq("request_candidate_id", fixture.candidateId)
            .maybeSingle();

          return data?.id ?? null;
        })
        .not.toBeNull();
      const { data: createdEngagement, error: createdEngagementError } =
        await adminClient
          .from("project_engagements")
          .select("id")
          .eq("request_candidate_id", fixture.candidateId)
          .single();

      if (createdEngagementError || !createdEngagement) {
        throw new Error("Could not read browser-created E2E engagement.");
      }

      const engagementId = createdEngagement.id;
      fixture.engagementId = engagementId;

      const providerEngagementSession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.provider.email,
          password: accounts.provider.password,
        },
        `/app/engagements/${engagementId}`,
      );

      await expect(
        providerEngagementSession.page.getByRole("button", { name: "Start work" }),
      ).toBeVisible();
      await expect(
        providerEngagementSession.page.getByRole("button", {
          name: "Submit deliverable",
        }),
      ).toHaveCount(0);
      await providerEngagementSession.page
        .getByRole("button", { name: "Start work" })
        .click();
      await expect(providerEngagementSession.page.getByText("Work started.")).toBeVisible();
      await expect(
        providerEngagementSession.page.getByRole("button", { name: "Start work" }),
      ).toHaveCount(0);
      await expect(
        providerEngagementSession.page.getByRole("button", {
          name: "Submit deliverable",
        }),
      ).toBeVisible();
      await providerEngagementSession.page
        .getByLabel("Deliverable URL")
        .fill("https://example.com/e2e-deliverable");
      await providerEngagementSession.page
        .getByLabel("Deliverable summary")
        .fill("Authenticated lifecycle E2E deliverable.");
      await providerEngagementSession.page
        .getByRole("button", { name: "Submit deliverable" })
        .click();
      await expect(
        providerEngagementSession.page.getByText("Deliverable submitted."),
      ).toBeVisible();
      await expect(
        providerEngagementSession.page.getByRole("button", {
          name: "Submit deliverable",
        }),
      ).toHaveCount(0);
      await providerEngagementSession.context.close();

      await expect
        .poll(async () => (await readEngagement(adminClient, engagementId)).status)
        .toBe("submitted");

      const studentEngagementSession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.student.email,
          password: accounts.student.password,
        },
        `/app/engagements/${engagementId}`,
      );

      await expect(
        studentEngagementSession.page.getByRole("button", {
          name: "Complete project",
        }),
      ).toBeVisible();
      await expect(
        studentEngagementSession.page.getByRole("button", { name: "Dispute" }),
      ).toBeVisible();
      await expect(
        studentEngagementSession.page.getByRole("button", {
          name: "Submit feedback",
        }),
      ).toHaveCount(0);
      await studentEngagementSession.page
        .getByRole("button", { name: "Complete project" })
        .click();
      await expect(
        studentEngagementSession.page.getByText("Engagement completed."),
      ).toBeVisible();
      await expect(
        studentEngagementSession.page.getByRole("button", {
          name: "Complete project",
        }),
      ).toHaveCount(0);
      await expect(
        studentEngagementSession.page.getByRole("button", { name: "Dispute" }),
      ).toHaveCount(0);
      await expect(
        studentEngagementSession.page.getByRole("button", {
          name: "Submit feedback",
        }),
      ).toBeVisible();
      await studentEngagementSession.page.getByLabel("Rating").selectOption("5");
      await studentEngagementSession.page
        .getByLabel("Feedback")
        .fill("Authenticated lifecycle E2E feedback.");
      await studentEngagementSession.page
        .getByRole("button", { name: "Submit feedback" })
        .click();
      await expect(
        studentEngagementSession.page.getByText("Feedback submitted."),
      ).toBeVisible();
      await expect(
        studentEngagementSession.page.getByRole("button", {
          name: "Submit feedback",
        }),
      ).toHaveCount(0);
      await expect(studentEngagementSession.page.getByText("5/5")).toBeVisible();
      await studentEngagementSession.context.close();

      await expect
        .poll(async () => (await readEngagement(adminClient, engagementId)).status)
        .toBe("completed");
      await expect
        .poll(async () => (await readRequest(adminClient, fixture.requestId)).status)
        .toBe("completed");

      const feedback = await readEngagementFeedback(adminClient, engagementId);

      expect(feedback.rating).toBe(5);
      expect(feedback.feedback_text).toBe("Authenticated lifecycle E2E feedback.");
    } finally {
      await cleanupLifecycleFixture(adminClient, fixture);
    }
  });

  test("keeps the disputed lifecycle read-only after student dispute", async ({
    browser,
  }) => {
    const fixture = await createAcceptedEngagementFixture(
      adminClient,
      adminRpcClient,
      accounts,
    );

    try {
      if (!fixture.engagementId) {
        throw new Error("Dispute fixture did not create an engagement.");
      }

      const providerSession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.provider.email,
          password: accounts.provider.password,
        },
        `/app/engagements/${fixture.engagementId}`,
      );

      await providerSession.page.getByRole("button", { name: "Start work" }).click();
      await expect(providerSession.page.getByText("Work started.")).toBeVisible();
      await providerSession.page
        .getByLabel("Deliverable summary")
        .fill("Dispute branch deliverable.");
      await providerSession.page
        .getByRole("button", { name: "Submit deliverable" })
        .click();
      await expect(providerSession.page.getByText("Deliverable submitted.")).toBeVisible();
      await providerSession.context.close();

      const studentSession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.student.email,
          password: accounts.student.password,
        },
        `/app/engagements/${fixture.engagementId}`,
      );

      await studentSession.page
        .getByLabel("Issue notes")
        .fill("The submitted deliverable does not match the agreed scope.");
      await studentSession.page.getByRole("button", { name: "Dispute" }).click();
      await expect(studentSession.page.getByText("Dispute submitted.")).toBeVisible();
      await expect(
        studentSession.page.getByRole("button", { name: "Complete project" }),
      ).toHaveCount(0);
      await expect(
        studentSession.page.getByRole("button", { name: "Submit feedback" }),
      ).toHaveCount(0);
      await expect(
        studentSession.page.getByRole("button", { name: "Dispute" }),
      ).toHaveCount(0);
      await studentSession.context.close();

      await expect
        .poll(async () => (await readEngagement(adminClient, fixture.engagementId!)).status)
        .toBe("disputed");

      const engagement = await readEngagement(adminClient, fixture.engagementId);

      expect(engagement.dispute_notes).toBe(
        "The submitted deliverable does not match the agreed scope.",
      );
      await expect
        .poll(async () => (await readRequest(adminClient, fixture.requestId)).status)
        .toBe("in_progress");
      expect(await countEngagementFeedback(adminClient, fixture.engagementId)).toBe(0);

      const providerReadOnlySession = await newAuthenticatedPage(
        browser,
        {
          email: accounts.provider.email,
          password: accounts.provider.password,
        },
        `/app/engagements/${fixture.engagementId}`,
      );

      await expect(
        providerReadOnlySession.page.getByRole("button", { name: "Submit deliverable" }),
      ).toHaveCount(0);
      await providerReadOnlySession.context.close();
    } finally {
      await cleanupLifecycleFixture(adminClient, fixture);
    }
  });

  test("rejects unauthorized authenticated engagement actions", async () => {
    const fixture = await createAcceptedEngagementFixture(
      adminClient,
      adminRpcClient,
      accounts,
    );

    try {
      if (!fixture.engagementId) {
        throw new Error("Authorization fixture did not create an engagement.");
      }

      const studentClient = await signInClient(
        env,
        accounts.student.email,
        accounts.student.password,
      );
      const providerClient = await signInClient(
        env,
        accounts.provider.email,
        accounts.provider.password,
      );
      const auxiliaryStudentClient = await signInClient(
        env,
        accounts.auxiliaryStudent.email,
        accounts.auxiliaryStudent.password,
      );

      const { error: studentStartError } = await studentClient.rpc(
        "start_my_engagement_work",
        {
          p_engagement_id: fixture.engagementId,
        },
      );
      const { error: studentSubmitError } = await studentClient.rpc(
        "submit_my_engagement_deliverable",
        {
          p_deliverable_summary: "Wrong side deliverable",
          p_deliverable_url: null,
          p_engagement_id: fixture.engagementId,
        },
      );

      expectAuthorizationFailure(studentStartError);
      expectAuthorizationFailure(studentSubmitError);

      const { error: providerStartError } = await providerClient.rpc(
        "start_my_engagement_work",
        {
          p_engagement_id: fixture.engagementId,
        },
      );
      const { error: providerSubmitError } = await providerClient.rpc(
        "submit_my_engagement_deliverable",
        {
          p_deliverable_summary: "Authorization fixture deliverable",
          p_deliverable_url: null,
          p_engagement_id: fixture.engagementId,
        },
      );

      expect(providerStartError).toBeNull();
      expect(providerSubmitError).toBeNull();

      const { error: providerCompleteError } = await providerClient.rpc(
        "complete_my_engagement",
        {
          p_engagement_id: fixture.engagementId,
        },
      );
      const { error: providerDisputeError } = await providerClient.rpc(
        "dispute_my_engagement",
        {
          p_dispute_notes: "Provider cannot dispute as the student.",
          p_engagement_id: fixture.engagementId,
        },
      );
      const { error: auxiliaryCompleteError } = await auxiliaryStudentClient.rpc(
        "complete_my_engagement",
        {
          p_engagement_id: fixture.engagementId,
        },
      );

      expectAuthorizationFailure(providerCompleteError);
      expectAuthorizationFailure(providerDisputeError);
      expectAuthorizationFailure(auxiliaryCompleteError);

      const { error: studentCompleteError } = await studentClient.rpc(
        "complete_my_engagement",
        {
          p_engagement_id: fixture.engagementId,
        },
      );

      expect(studentCompleteError).toBeNull();

      const { error: providerFeedbackError } = await providerClient.rpc(
        "submit_my_engagement_feedback",
        {
          p_engagement_id: fixture.engagementId,
          p_feedback_text: "Provider cannot submit student feedback.",
          p_rating: 5,
        },
      );
      const { error: auxiliaryFeedbackError } = await auxiliaryStudentClient.rpc(
        "submit_my_engagement_feedback",
        {
          p_engagement_id: fixture.engagementId,
          p_feedback_text: "Auxiliary student cannot submit owner feedback.",
          p_rating: 5,
        },
      );

      expectAuthorizationFailure(providerFeedbackError);
      expectAuthorizationFailure(auxiliaryFeedbackError);
      expect(await countEngagementFeedback(adminClient, fixture.engagementId)).toBe(0);
    } finally {
      await cleanupLifecycleFixture(adminClient, fixture);
    }
  });
});
