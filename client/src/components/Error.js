import React from 'react'
import erroimg from '../images/404 Error Page not Found with people connecting a plug-amico.svg'
import '../css/App.css'

function Error() {
    return (
        <>
            <div className="container-fluidr">
                <div className="row">
                    <div className="col-md-10 ">
                        <div className="row">

                            <div className="col-md-12">
                                <div className="errimg" style={{marginTop: "5rem"}}>
                                    <img src={erroimg} style={{width: "40vw", margin: "auto"}} alt=" " />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Error
