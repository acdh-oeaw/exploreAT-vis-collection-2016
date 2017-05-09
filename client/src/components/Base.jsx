import React from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink } from 'react-router-dom';


const Base = props => (
    <div>
        <div className="top-bar">
            <div className="top-bar-left">
                <NavLink exact to="/">React App</NavLink>
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