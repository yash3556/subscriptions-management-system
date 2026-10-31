import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthLayout({
  title,
  description,
  children,
}: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className="auth-experience">
        <aside aria-label="About Brightloop" className="auth-showcase">
          <div className="auth-brand">
            <span aria-hidden="true" className="brand-mark">B</span>
            <span>BRIGHTLOOP</span>
          </div>
          <div className="auth-showcase-copy">
            <p className="auth-showcase-kicker">Subscriptions, simplified</p>
            <h2>
              Your business,
              <span className="block">in sync.</span>
            </h2>
            <p className="auth-showcase-description">
              A clearer way to bring customers, plans, and billing together.
            </p>
            <div aria-hidden="true" className="auth-showcase-tags">
              <span>Customers</span>
              <span>Plans</span>
              <span>Billing</span>
            </div>
          </div>
        </aside>
        <section aria-labelledby="auth-title" className="auth-content">
          <div className="auth-brand">
            <span aria-hidden="true" className="brand-mark">B</span>
            <span>BRIGHTLOOP</span>
          </div>
          <div className="auth-form-panel">
            <h1 className="auth-form-heading" id="auth-title">
              {title}
            </h1>
            <p className="auth-form-description">{description}</p>
            <div>{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
