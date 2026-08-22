import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import type { Company } from "@/lib/companies";

export function OverviewPanel({ company }: { company: Company }) {
  return (
    <section className="workspace-section overview-section">
      <h2>기업 개요</h2>
      <p className="company-summary">{company.summary}</p>
      <dl className="company-facts">
        <div>
          <dt>상장시장</dt>
          <dd>{company.market}</dd>
        </div>
        <div>
          <dt>산업</dt>
          <dd>{company.sector}</dd>
        </div>
        <div>
          <dt>주요 공시</dt>
          <dd>{company.filingForms.join(", ")}</dd>
        </div>
      </dl>
      <div className="company-links">
        {company.websiteUrl && (
          <a href={company.websiteUrl} target="_blank" rel="noreferrer">
            기업 웹사이트 <ArrowSquareOut size={15} />
          </a>
        )}
        {company.irUrl && (
          <a href={company.irUrl} target="_blank" rel="noreferrer">
            IR 페이지 <ArrowSquareOut size={15} />
          </a>
        )}
      </div>

      {company.research && (
        <div className="company-research">
          <section className="research-section business-model-section">
            <div className="research-heading">
              <h2>Business Model</h2>
              <time dateTime={company.research.asOfDate}>기준 {company.research.asOfDate}</time>
            </div>
            <p className="business-model-copy">{company.research.businessModel}</p>
            <dl className="research-facts">
              <div>
                <dt>수익 구조</dt>
                <dd>{company.research.revenueModel}</dd>
              </div>
              <div>
                <dt>고객 구조</dt>
                <dd>{company.research.customerStructure}</dd>
              </div>
              <div>
                <dt>비용 구조</dt>
                <dd>{company.research.costStructure}</dd>
              </div>
              <div>
                <dt>자본집약도</dt>
                <dd>{company.research.capitalIntensity}</dd>
              </div>
            </dl>
          </section>

          <section className="research-section">
            <h2>사업 구성</h2>
            <div className="business-line-list">
              {company.research.businessLines.map((line) => (
                <article className="business-line" key={line.id}>
                  <h3>{line.name}</h3>
                  <p>{line.description}</p>
                  <div>
                    <span>{line.revenueRole}</span>
                    <small>{line.endMarkets}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="research-section research-point-columns">
            <div>
              <h2>가치 동인</h2>
              <div className="research-point-list">
                {company.research.valueDrivers.map((point) => (
                  <article key={point.id}>
                    <h3>{point.title}</h3>
                    <p>{point.description}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <h2>구조적 위험</h2>
              <div className="research-point-list">
                {company.research.risks.map((point) => (
                  <article key={point.id}>
                    <h3>{point.title}</h3>
                    <p>{point.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div className="research-sources">
            <span>근거</span>
            {company.research.sources.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                {source.sourceType} · {source.publishedAt}
                <ArrowSquareOut size={14} />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
