import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';


const Base = props => (
    <div>
        <div className="top-bar">
            <div className="top-bar-left">
                <Link to="/">ExploreAT!</Link>
            </div>

            <div className="top-bar-right">
                <Link to="/login">Log in</Link>
                <Link to="/signup">Sign up</Link>
            </div>

        </div>

        {props.children}

    </div>
);

// Base.propTypes = {
//     children: PropTypes.object.isRequired
// };

export default Base;