import React, { useState } from 'react'
import '../css/App.css'

const Question = () => {
    const [Question, SetQuestion] = useState("Null")
    const handleOnChange = (e) => {
        SetQuestion(e.target.value)
      }
    const question = ()=> {
        const faqs = document.querySelectorAll('.faq')

        faqs.forEach(faq => {
            faq.addEventListener('click', () => {
                faq.classList.toggle('open')

                // change icon
                const icon = faq.querySelector('.faq_icon i')
                if (icon.className === 'uil uil-plus') {
                    icon.className = 'uil uil-minus'
                }
                else {
                    icon.className = 'uil uil-plus'
                }
            })
        })

    }
    return (
        <>
            <section className="faqs">
                <h2>Frequently Asked Questions</h2>
                <div className="container container_fas faqs_container" value={Question} onChange={handleOnChange} onClick={question}>
                    <article className="faq"  >
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>How do I know the right course for me?</h4>
                            <p>Think about your existing experience and skill set.
                                Consider prospective careers and employment opportunities and
                                Think about what subjects interest you.</p>
                        </div>
                    </article>

                    {/* <!-- 1 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>Do i really need all my ingredients to be at room temperature?</h4>
                            <p>Yess! I cannot stress this fact enough! So many people think this is insignificant, but the
                                temperature of your ingredients majorly affects the finished product. Your ingredients must
                                always be at room temperature, unless mentioned otherwise in the recipe. Lay out all your
                                ingredients on the kitchen counter at least 30 minutes before you start. A recipe that calls for
                                creaming butter and sugar will not work if your butter is cold. It needs to be soft to be able
                                to get to the right consistency and trap air. Having ingredients at room temperature allows them
                                to combine with each other homogeneously. Cold ingredients will not combine smoothly, leading to
                                denser cakes, hard and flat cookies and clumpy frosting!</p>
                        </div>
                    </article>

                    {/* <!-- 2 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>Can i substitute whole wheat for all purpose flour?</h4>
                            <p>While whole wheat flour can be easily replaced with all purpose flour, or maida, in all my
                                recipes, it is not so simple the other way around. The germ and bran in whole wheat absorb more
                                water, making baked goods denser and more crumbly. In cakes, where you need that light, fluffy
                                and airy texture, you must stick to using all purpose flour. </p>
                        </div>
                    </article>

                    {/* <!-- 3 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>I don' t have a stand mixer, can i still make this?</h4>
                            <p>While a stand mixer definitely makes the job so much easier, you compulsorily do not need to
                                invest in one to create delicious, stunning desserts. A stand mixer is quick and efficient, but
                                a balloon whisk or a wooden spoon too can do a pretty good job. You'll have to strain your
                                muscles quite a bit to achieve the desired results though, haha! I suggest investing in a simple
                                electric hand mixer, if not a stand mixer. It is extremely useful and versatile and would make
                                baking seem almost effortless!</p>
                        </div>
                    </article>

                    {/* <!-- 4 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>Can i substitute oil for butter?</h4>
                            <p>Generally speaking, no. Butter cannot always be replaced with oil in baking recipes. Oil lacks
                                butter's essential quality to be whipped. Butter is also essential in contributing to the flaky
                                texture of pie and tart dough. You also can not replace butter with oil in cookie recipes. That
                                will ruin the cookie dough texture and your cookies will spread too much. They will also not
                                firm up because oil doesn't set like butter does.</p>
                        </div>
                    </article>

                    {/* <!-- 5 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>How do i fix broken buttercream?</h4>
                            <p>Buttercream is an emulsion of fat and liquid, and can potentially break into its constituent
                                ingredients if not handled properly. Greasy, grainy clumps of mass characterise broken
                                buttercream. However, you do not need to stress so much, because I'll tell you few easy ways to
                                fix broken buttercream! Now ideally, all ingredients should be at room temperature.</p>
                        </div>
                    </article>

                    {/* <!-- 6 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>My cakes are often cracked at the surface. How do i prevent this?</h4>
                            <p>There's a few reasons why your cake might crack on the surface. Usually, it is because the
                                temperature of the oven is too high. When the oven is too hot, the outside of the cake cooks
                                much faster than the inside. Soon, a crust forms while the inside of the cake continues to bake
                                and rise, forming a crack on the crust.</p>
                        </div>
                    </article>

                    {/* <!-- 7 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>My cake sunk upon taking out of the oven and is gooey in the middle, what went wrong?</h4>
                            <p>Yes, the cake is definitely under baked. Even if a cake has a perfect golden brown edge and nice
                                looking crust, but still sinks in the middle, you didn't bake it for long enough. The cake
                                should have a springy texture, not a gooey one. If you are unsure of whether the cake is baked
                                through, try doing the touch tests.</p>
                        </div>
                    </article>

                    {/* <!-- 8 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>Can I substitute whole wheat for all-purpose flour?</h4>
                            <p>Replacing white flour with whole wheat generally makes baked goods denser, drier, and more
                                crumbly because the germ and bran in whole wheat absorbs more water. So in the case of baked
                                good where you want a light and tender texture, like cake, it's just a bad idea. In the case of
                                pancakes, muffins, and quick breads, though, where the batter tends to have more liquid, you can
                                usually get away with substituting up to 25% of the white flour for whole wheat. It will
                                definitely have an impact on the texture, but usually in a way that is intriguing rather than
                                disastrous, and will add some flavor and nuttiness to the equation.</p>
                        </div>
                    </article>

                    {/* <!-- 9 --> */}
                    <article className="faq">
                        <div className="faq_icon">
                            <i className="uil uil-plus"></i>
                        </div>
                        <div className="question_answer">
                            <h4>Do I really need parchment paper?</h4>
                            <p>Parchment paper is an essential baking tool because it creates a nonstick surface. If you want
                                cakes to release cleanly, brownies to lift out of the pan, and cookies to slide off the sheet,
                                parchment paper is a must. It can be a little pricey, but it's also available in pretty much
                                every baking aisle and is 100% worth it—way better than having a cake that you worked so hard on
                                refuse to come out of the pan.</p>
                        </div>
                    </article>
                </div>
            </section>
        </>
    )
}

export default Question
