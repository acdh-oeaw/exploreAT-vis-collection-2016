import React from 'react';
import Base from '../components/Base.jsx';

import { Card, CardTitle } from 'material-ui/Card';

const HomePage = () => (
    <Base>
        <Card className="container">
            <CardTitle title="ExploreAT! Prototypes" subtitle="This is the home page of the ExploreAT project visual prototypes." />
        </Card>
    </Base>
);

export default HomePage;
