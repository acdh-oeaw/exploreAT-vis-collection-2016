import React from 'react';
import Base from '../components/Base.jsx'
import { Card, CardTitle } from 'material-ui/Card';

const HomePage = () => (
    <Base>
        <Card className="container">
            <CardTitle title="React Application" subtitle="This is the home page." />
        </Card>
    </Base>
);

export default HomePage;
