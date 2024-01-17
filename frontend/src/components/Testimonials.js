import React, { useEffect, useRef } from "react";

function Testimonials(props) {
  const { resumeData } = props;
  const flexsliderRef = useRef(null);

  useEffect(() => {
    if (window.jQuery && window.jQuery.fn.flexslider) {
      const $flexslider = window.jQuery(flexsliderRef.current);
      $flexslider.flexslider({
        animation: "slide",
        directionNav: false,
        touch: true,
      });

      return () => {
        $flexslider.flexslider("destroy");
      };
    }
  }, []);

  return (
    <section id="testimonials">
      <div className="text-container">
        <div className="row">
          <div className="two columns header-col">
            <h1>
              <span>Client Testimonials</span>
            </h1>
          </div>
          <div className="ten columns flex-container">
            <div className="flexslider" ref={flexsliderRef}>
              <ul className="slides">
                {resumeData.testimonials &&
                  resumeData.testimonials.map((item) => {
                    return (
                      <li key={item.id}>
                        <blockquote>
                          <p>{item.description}</p>
                          <cite>{item.name}</cite>
                        </blockquote>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
