// Example: Landing.jsx (or your main page)
export default function Landing({ LLM, Training, Twins, Omniverse }) {
  return (
    <>
      <section className="acSection acSection--hero">
        <div className="acContainer">
          <div className="acRail">
            <div className="acKicker">Application-led sizing</div>
            <h1 className="acHeroTitle">Plan AI infrastructure with clarity</h1>
            <p className="acHeroSub">
              Translate usage patterns, performance targets, and governance constraints into
              practical GPU, CPU, memory, and storage requirements.
            </p>

            <div className="acCtas">
              <button className="acBtn acBtnPrimary" onClick={() => location.hash = "#llm"}>
                Start sizing
              </button>
              <button className="acBtn" onClick={() => location.hash = "#twins"}>
                Explore digital twins
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="acSection" id="llm">
        <div className="acContainer">
          <div className="acGrid2">
            <div className="acCard"><div className="acCardInner">{LLM}</div></div>
            <div className="acCard"><div className="acCardInner">{Training}</div></div>
          </div>
        </div>
      </section>

      <section className="acSection" id="twins">
        <div className="acContainer">
          <div className="acCard">
            <div className="acCardInner">{Twins}</div>
          </div>
        </div>
      </section>

      <section className="acSection" id="omniverse">
        <div className="acContainer">
          <div className="acCard">
            <div className="acCardInner">{Omniverse}</div>
          </div>
        </div>
      </section>
    </>
  );
}