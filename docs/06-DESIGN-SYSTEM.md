# Design System

> Version: v0.1  
> Status: Practical MVP design baseline. Brand identity remains provisional.

## Design Status

No final brand identity has been chosen.

The MVP design should communicate **clarity, trust, speed, and affordability** without spending significant time on visual polish before marketplace validation.

## Product Personality

- **Clear:** Explain what happens next and avoid marketplace jargon.
- **Trustworthy:** Show real process, provider review, privacy expectations, and honest limitations.
- **Practical:** Optimize for completing a task, not browsing endlessly.
- **Student-friendly:** Plain language, understandable budgets, mobile-friendly forms.
- **Professional enough for paid work:** The experience should feel credible to both sides and not resemble an informal classifieds board.

## Design Principles

- Make the next action obvious.
- Keep forms short and readable.
- Make pricing and expectations clear.
- Avoid visual complexity that slows launch.
- Build trust through clarity, not decoration.
- Prefer one strong primary action per screen.
- Show status and response expectations.
- Use progressive disclosure: ask detailed questions only when needed.
- Never use manipulative urgency or fake scarcity.
- Never imply guaranteed grades, academic outcomes, income, or project success.

## Audience Considerations

### Students

- Need confidence that help is legitimate and affordable.
- Need to understand what happens after submitting a request.
- May be deadline-sensitive.
- May not know technical vocabulary.
- Need reassurance that private project/contact details are not public.

### Providers

- Need confidence that opportunities are real.
- Need clear scope, budget, deadline, and expected deliverables.
- Need simple onboarding.
- Need to know that irrelevant leads will be filtered.
- Need clear rules about prohibited academic work.

## Brand Foundations

- **Product name:** Working placeholder: `ProjectMatch`. Do not treat as final or register assets around it yet.
- **Tagline:** `Find the right builder for your next project.` Working copy only.
- **Tone of voice:** Direct, calm, helpful, specific, non-hype.
- **Colors:** Use a neutral base with one trustworthy primary accent. Working direction: blue/indigo family; final tokens to be chosen only when UI implementation starts.
- **Typography:** Use a highly readable system or open-source sans-serif; prioritize load speed and legibility over brand novelty.
- **Logo direction:** Simple wordmark or minimal symbol; logo work should not block validation.

## UI Foundations

### Layout

- **Page structure:** Clear header, concise value proposition, one primary CTA, trust/process explanation, FAQ/policy link.
- **Form structure:** One column, logical groups, visible required fields, inline help, mobile-first.
- **Admin view structure:** Table/list first, filters second, detail drawer/page for notes and actions.

### Components

- **Buttons:** One primary style, one secondary style, destructive style only for destructive actions. Labels should describe action, e.g. `Submit project request`.
- **Inputs:** Visible labels above inputs; placeholders are examples, not substitutes for labels.
- **Selects:** Use for project type, budget range, status, skills, and decline reason when controlled values improve reporting.
- **Status labels:** Use consistent text labels: New, Reviewed, Matched, In progress, Completed, Cancelled, Approved, Waitlisted, etc.
- **Cards:** Use sparingly for provider summaries or project summaries; avoid card-heavy dashboards.
- **Tables:** Primary admin component for requests, providers, matches, outcomes.
- **Empty states:** Explain why the area is empty and give the next useful action.
- **Error states:** Plain-language explanation + how to fix or retry.
- **Success states:** Confirm submission, expected response time, and what happens next.

## Recommended MVP Screens

Only build when the roadmap reaches product implementation.

1. Landing / value proposition.
2. Student project request form.
3. Provider application form.
4. Submission confirmation.
5. Operator/admin request list.
6. Operator/admin provider list.
7. Operator/admin match/outcome detail.

User accounts, profile browsing, dashboards, native messaging, and payment checkout are later-stage screens.

## Accessibility Baseline

- **Clear labels:** Every form control has a visible label.
- **Sufficient contrast:** Meet WCAG AA contrast where practical.
- **Keyboard-friendly forms:** Logical focus order and visible focus state.
- **Helpful error messages:** Identify the field and the resolution.
- **Responsive layouts:** Work on common mobile widths first.
- **Semantic HTML:** Use proper headings, buttons, links, forms, and table semantics.
- **Reduced motion:** Avoid required motion; respect user preferences if animation is introduced.
- **Touch targets:** Keep interactive elements comfortably tappable.

## Content Guidelines

- Use plain language.
- Avoid vague claims such as “best talent” unless evidence exists.
- Be direct about process, timing, pricing, and what is manual.
- Avoid language that implies guaranteed academic outcomes.
- Say “project help”, “design/development support”, “build”, “prototype”, or “tutoring/feedback” only where accurate.
- Do not market the service as a way to have someone complete graded coursework.
- Use realistic trust copy such as “providers are reviewed before they receive opportunities” rather than “100% safe”.

## Open Questions

- **Open Question:** What final product name should be tested with users?
- **Open Question:** Which tone resonates better: startup/creator-focused or university/community-focused?
- **Open Question:** Should provider profiles be public in Stage 3 or remain curated/concierge?
- **Open Question:** Which visual system best fits the first implementation stack?
