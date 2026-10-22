<script lang="ts">
  import { HOW_WE_COUNT } from '../content';
</script>

<section id="how" class="how" aria-labelledby="how-title">
  <div class="wrap">
    <h2 id="how-title" class="display">How we count</h2>
    <p class="intro">{HOW_WE_COUNT.intro}</p>

    <div class="method">
      <ol class="steps">
        {#each HOW_WE_COUNT.steps as s, i (i)}
          <li>
            <span class="n" aria-hidden="true">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        {/each}
      </ol>

      <div>
        <h3 class="sub">Reading the numbers</h3>
        <dl>
          {#each HOW_WE_COUNT.reading as t (t.term)}
            <div>
              <dt>{t.term}</dt>
              <dd>{t.text}</dd>
            </div>
          {/each}
        </dl>
      </div>
    </div>

    <h3 class="sub measures-title">What each measure counts</h3>
    <ul class="measures">
      {#each HOW_WE_COUNT.measures as m (m.term)}
        <li style:--c="var(--{m.tone})">
          <h4>{m.term}</h4>
          <p>{m.text}</p>
        </li>
      {/each}
    </ul>

    <div class="caveats">
      <h3 class="sub">Good to know</h3>
      <ul>
        {#each HOW_WE_COUNT.caveats as c, i (i)}<li>{c}</li>{/each}
      </ul>
    </div>
  </div>
</section>

<style>
  /* Sits right under the headline numbers, so the method is easy to find. */
  .how {
    padding: clamp(40px, 5vw, 64px) 0;
    background: var(--paper-2);
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
  }
  h2 {
    font-size: clamp(30px, 3.8vw, 44px);
  }
  .intro {
    margin: 12px 0 0;
    max-width: 46em;
    font-size: 17px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  .method {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: 36px clamp(36px, 5vw, 72px);
    align-items: start;
    margin-top: clamp(30px, 4vw, 48px);
  }
  .sub {
    font-size: 21px;
    margin-bottom: 8px;
  }

  /* The steps: numbered circles joined by a line. */
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .steps li {
    position: relative;
    padding: 0 0 26px 50px;
  }
  .steps li:last-child {
    padding-bottom: 0;
  }
  .steps li:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 32px;
    bottom: 0;
    width: 2px;
    background: var(--rule-strong);
  }
  .n {
    position: absolute;
    left: 0;
    top: -5px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--teal-deep);
    color: var(--paper);
    font-size: 15px;
    font-weight: 800;
  }
  .steps h3 {
    font-size: 21px;
    margin-bottom: 6px;
  }
  .steps p {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--ink-2);
    max-width: 40em;
  }

  dl {
    margin: 0;
  }
  dl > div {
    padding: 10px 0;
    border-top: 1px solid var(--rule-strong);
  }
  dt {
    font-size: 15px;
    font-weight: 700;
  }
  dd {
    margin: 3px 0 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  /* What each measure counts: one card per number, colored like the numbers above. */
  .measures-title {
    margin-top: clamp(40px, 5vw, 60px);
  }
  .measures {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .measures li {
    padding: 14px 16px 16px;
    background: var(--card);
    border-top: 4px solid var(--c);
  }
  h4 {
    margin: 0 0 5px;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
  }
  .measures p {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  .caveats {
    margin-top: clamp(32px, 4vw, 48px);
  }
  .caveats ul {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 40px;
  }
  .caveats li {
    position: relative;
    padding-left: 18px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .caveats li::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0.6em;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--teal);
  }

  @media (max-width: 960px) {
    .method {
      grid-template-columns: 1fr;
    }
    .measures {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    .measures,
    .caveats ul {
      grid-template-columns: 1fr;
    }
    .steps li {
      padding-left: 46px;
    }
  }
</style>
