import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/images/famfi_hero.png";

const outcomes = [
  {
    label: "Chores",
    title: "Assign work that turns into payday",
    text: "Create chores, approve finished tasks, and keep reward amounts consistent across the family.",
  },
  {
    label: "Savings",
    title: "Show kids where their money goes",
    text: "Buckets make saving, spending, and giving visible without a spreadsheet or cash envelope.",
  },
  {
    label: "Parents",
    title: "Invite another parent into the same home",
    text: "Shared family setup keeps both parents working from the same children, balances, and invite code.",
  },
];

const steps = [
  "Create a family home",
  "Add children and buckets",
  "Approve chores and pay out",
];

export default function WelcomePage() {
  return (
    <div className="welcome-page">
      <header className="welcome-nav">
        <Link href="/welcome" className="welcome-brand" aria-label="FamFi Piggy Bank home">
          <span className="welcome-brand-mark">$</span>
          <span>FamFi</span>
        </Link>
        <nav className="welcome-actions" aria-label="Account">
          <Link href="/login" className="ghost-button">Login</Link>
          <Link href="/signup" className="button">Get Started</Link>
        </nav>
      </header>

      <main>
        <section className="welcome-hero">
          <Image
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="welcome-hero-image"
            fill
            priority
            sizes="100vw"
          />
          <div className="welcome-hero-overlay" />
          <div className="welcome-hero-content">
            <p className="hero-tag">The Digital Piggy Bank For Modern Families</p>
            <h1>FamFi Piggy Bank</h1>
            <p>
              Kids earn money through chores, save in themed buckets, watch interest grow, and
              build real financial habits without cash or spreadsheets.
            </p>
            <div className="welcome-actions hero-actions">
              <Link href="/signup" className="button">Start Free</Link>
              <Link href="/login" className="ghost-button">I Have an Account</Link>
            </div>
            <div className="welcome-social-proof" aria-label="Family activity">
              <span>Kids, parents, chores, and savings in one family bank</span>
            </div>
          </div>
        </section>

        <section className="welcome-proof" aria-label="How FamFi works">
          {steps.map((step, index) => (
            <div className="welcome-proof-item" key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </section>

        <section className="welcome-section">
          <div className="welcome-section-heading">
            <p className="eyebrow">Built For Real Family Routines</p>
            <h2>Money practice without the awkward bookkeeping</h2>
            <p>
              FamFi gives parents structure without making kids feel like they are using accounting
              software.
            </p>
          </div>
          <div className="welcome-outcome-grid">
            {outcomes.map((outcome) => (
              <article className="welcome-outcome-card" key={outcome.title}>
                <span>{outcome.label}</span>
                <h3>{outcome.title}</h3>
                <p>{outcome.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="welcome-product-band">
          <div>
            <p className="eyebrow">Inside The App</p>
            <h2>One place for chores, buckets, interest, gifts, and spending</h2>
          </div>
          <div className="welcome-dashboard-preview" aria-label="Example family snapshot">
            <div className="welcome-preview-header">
              <span>Family Snapshot</span>
              <strong>$84.40 saved</strong>
            </div>
            <div className="welcome-preview-row">
              <span>Chores ready for payday</span>
              <strong>6</strong>
            </div>
            <div className="welcome-preview-row">
              <span>Savings buckets active</span>
              <strong>9</strong>
            </div>
            <div className="welcome-preview-row">
              <span>Default chore reward</span>
              <strong>$0.10</strong>
            </div>
          </div>
        </section>

        <section className="welcome-cta">
          <p className="eyebrow">Start Today</p>
          <h2>Turn allowance into a repeatable family system</h2>
          <div className="welcome-actions">
            <Link href="/signup" className="button">Create Account</Link>
            <Link href="/login" className="ghost-button">Login</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
