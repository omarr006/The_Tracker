# Model Selection Guide for Copilot CLI

## Model Tiers & Pricing

| Model | Tier | Cost | Speed | Use Case |
|-------|------|------|-------|----------|
| GPT 4.1 | Rank 1 | Cheapest | Fast | Simple tasks, questions |
| GPT 5 Mini | Rank 1 | Cheapest | Fast | Simple tasks, questions |
| GPT 5.4 Mini | Rank 2 | Low | Fast | Light coding, refactors |
| Haiku 4.5 | Rank 2 | Low | Fastest | Exploration, research |
| Sonnet 4.5 | Rank 3 | Standard | Balanced | Main development work |
| Opus 4.5 | Rank 4 | Premium (3x) | Slower | Critical/complex only |

---

## Task-to-Model Recommendations

### **Rank 1: GPT 4.1 / GPT 5 Mini**
Use for tasks that don't modify code or are purely informational.

**When to use:**
- Asking questions about concepts (e.g., "What is React Native?")
- Explaining existing code (e.g., "What does this function do?")
- Reviewing documentation or protocols (e.g., "What's in SESSION_PROTOCOL.md?")
- Simple text edits (adding comments, updating README)
- Planning discussions (before implementation)
- Cost estimation or research queries

**Examples:**
- "Explain package-lock.json"
- "What's the difference between GPT models?"
- "Review SESSION_PROTOCOL.md and summarize"
- "Should I add comments to code?"

---

### **Rank 2: GPT 5.4 Mini / Haiku 4.5**
Use for lightweight coding tasks or exploration.

**When to use:**
- Code exploration (finding files, searching patterns)
- Simple refactors (renaming variables, formatting)
- Running tests or builds (task agents)
- Adding minor features (single function, small UI change)
- Fixing typos or linting issues
- Creating config files (package.json tweaks)

**Examples:**
- "Add TypeScript types to this function"
- "Rename variable `userId` to `userID` across files"
- "Run tests and show results"
- "Fix linting errors in LoginScreen.tsx"
- "Search codebase for all Supabase calls"

---

### **Rank 3: Sonnet 4.5** ⭐ **PRIMARY MODEL**
Use for most real development work. This is your default for building features.

**When to use:**
- Building new screens or components
- Implementing authentication or backend logic
- Creating database schemas or migrations
- Setting up navigation or routing
- Debugging errors with multiple files involved
- Writing Edge Functions or API endpoints
- Integrating third-party services (Supabase, OpenAI, RevenueCat)
- Multi-step feature implementation

**Examples:**
- "Build workout entry screen with text input and AI parsing"
- "Create Supabase Edge Function to call OpenAI API"
- "Fix render error in LoginScreen.tsx"
- "Implement chart generation with Python backend"
- "Add RevenueCat subscription flow"
- "Debug authentication flow issues"

**This model should handle 80-90% of your work.**

---

### **Rank 4: Opus 4.5** 🚨 **RARE USE ONLY**
Use only for critical or highly complex tasks where Sonnet 4.5 struggles.

**When to use:**
- Complex architectural decisions requiring deep reasoning
- Debugging obscure issues after Sonnet 4.5 fails multiple times
- Refactoring large codebases with inter-dependencies
- Performance optimization requiring advanced analysis
- Security-critical implementations (encryption, OAuth setup)
- Multi-phase feature planning with many unknowns

**Examples:**
- "Architect complete AI agent orchestration system with state management"
- "Debug memory leak in React Native navigation (tried 3 times with Sonnet)"
- "Optimize app bundle size and load time (complex webpack config)"
- "Design end-to-end security architecture for HIPAA compliance"

**Avoid using Opus for routine work. Only escalate when necessary.**

---

## Decision Tree

```
START
  ↓
Question or read-only task?
  YES → Rank 1 (GPT 4.1 / GPT 5 Mini)
  NO ↓
  
Simple code change (single file, <50 lines)?
  YES → Rank 2 (GPT 5.4 Mini / Haiku 4.5)
  NO ↓
  
Feature work, debugging, or multi-file changes?
  YES → Rank 3 (Sonnet 4.5) ← DEFAULT
  NO ↓
  
Did Sonnet fail multiple times or is this security/architecture critical?
  YES → Rank 4 (Opus 4.5) ← RARE
  NO → Use Rank 3 (Sonnet 4.5)
```

---

## Cost Optimization Tips

1. **Start each session with the right model.** Don't switch mid-session—you lose context.
2. **Batch questions.** Ask multiple things in one message instead of back-and-forth.
3. **Use Rank 2 for exploration.** Haiku is perfect for "find this file" or "search for pattern."
4. **Reserve Opus for real emergencies.** It costs 3x more—only use when stuck.
5. **Sonnet is your workhorse.** Don't downgrade to save pennies if you need real coding.

---

## Phase-Specific Recommendations

### Phase 1: MVP (Current)
- **Planning & questions:** Rank 1
- **Building screens, auth, Edge Functions:** Rank 3 (Sonnet 4.5)
- **File exploration:** Rank 2
- **Critical debugging (if stuck):** Rank 4

### Phase 2: Subscriptions & OAuth
- **RevenueCat integration:** Rank 3
- **Google/Apple OAuth setup:** Rank 3 (or Rank 4 if security-critical)
- **Testing payment flows:** Rank 2

### Phase 3: AI Agent System
- **AI orchestration architecture:** Rank 4 (complex design)
- **Implementing functions:** Rank 3
- **Testing/debugging:** Rank 2-3

### Phase 4: Chart Generation & Python
- **Matplotlib backend:** Rank 3
- **Edge Function optimization:** Rank 3
- **Simple chart tweaks:** Rank 2

### Phase 5: Polish & Deploy
- **Bug fixes:** Rank 2-3
- **Performance issues:** Rank 3 (or Rank 4 if severe)
- **Documentation:** Rank 1

---

## Summary

- **80% of work:** Sonnet 4.5 (Rank 3)
- **15% of work:** GPT 5.4 Mini / Haiku 4.5 (Rank 2)
- **4% of work:** GPT 4.1 / GPT 5 Mini (Rank 1)
- **1% of work:** Opus 4.5 (Rank 4)

**Rule of thumb:** If you're coding, use Sonnet. If you're asking or exploring, use cheaper models. Only upgrade to Opus when truly stuck.
