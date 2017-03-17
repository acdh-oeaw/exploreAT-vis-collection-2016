#ExploreAT! - Exploring the Austria's Culture through the Language Glass 


http://www.oeaw.ac.at/acdh/de/exploreAT
<a href="https://exploreat.usal.es">https://exploreat.usal.es</a>

##Introduction 

This is the official code repository of the **ExploreAT!** Project. 
This project aims to reveal unique insights into the rich texture of the German Language, especially in Austria, by providing state of the art tools for exploring the unique collection (1911-1998) of the Bavarian Dialects in the region of the Austro-Hungarian Empire. This corpus is large and rich, estimated to contain 200,000 headwords in estimated 4 Million records. The collection includes a five-volume dictionary of about 50,000 headwords, covering a period from the beginning of German language until the present (DBÖ, WBÖ).

This work has generated some publications that can be found [here](https://exploreat.usal.es/our-publications). The one that shows the work accomplished by this applications is located [here](https://exploreat.usal.es/publication/spatio-temporal-visual-analysis-tool-historical-dictionaries).

The code listed in this repository comprises the efforts of the [Data Visualization Group](http://vis.usal.es/) at Universidad de Salamanca (Spain) in the context of the project in creating a set of prototypes that illustrate the application of common data visualization techniques in the context of e-lexicography. 
For this purpose, several microprototypes depicting these techniques were created. Each one of them uses one of the two available DBÖ datasets, given in MySQL and [TUSTEP](https://tustep.wikispaces.com/TUSTEP-Wiki) formats.

For specific information on each prototype please refer to [USAGE](documentation/USAGE.md).

**Please note the data necessary to run this project is currently owned by the [Center for Digital Humanities at the Austrian Academy of Sciences](http://www.oeaw.ac.at/acdh/) and it is not in the public domain yet. Please contact the center in case you are interested in using the data.**

##Installing
First start by clone the repo and run, `npm install` and `bower install` to install the required dependencies.
Then proceed to import the data (see next sections) and run ``npm start`` to execute the environment locally. After that open a browser
and go to [localhost:3000](http://localhost:3000). 


##Components
This is a [Express.js](https://expressjs.com/) application. The framework is used to serve the static pages and assets. [Passport.js](http://passportjs.org) manages access permissions, user registration, by 
Authentication is only required in non-development environments. 
 
Whereas some prototypes employ the Javascript MySQL client, some others employ a combination of the datasets that extracts the spatiotemporal dimension and other features from the text.
In order to accomplish these tasks, several [Node.js](https://github.com/nodejs/node) scripts were made, which can be found in the [scripts](scripts/) folder. These scripts index the data in an [ElasticSearch](https://elastic.co/) instance so it can be searched
in the visualizations. The data is in turn retrieved in the client using the official [ElasticSearch javascript library](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html) and data visualizations are created with [d3.js](https://d3js.org).
See the next section for details.
 
 
##Mappings
 Example ElasticSearch index mappings can be found under the [scripts/mappings](scripts/mappings) folder. These mappings are key to the correct operation of the platform.
 Please refer to the ElasticSearch [guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html) for more information on this topic.

##Scripts
As mentioned in the previous section, several node.js scripts are needed for the textual feature extraction stage and data indexing. Once mappings have been defined, 
 ElasticSearch is ready to ingest data. The import is a 2-step process, each one of them embodied by a different script. 

 We provide a list of places found in TUSTEP files and general counts in [scripts/places.json](scripts/places.json). This list can be regenerated employing the [scripts/tustep.js](scripts/tustep.js) (which will also create an index in ElasticSearch)
 We recommend running this script first to explore the data using tools like [Kibana](https://www.elastic.co/products/kibana). 
 
The first script ``geolocalizator.js`` is semi-automatic and requires of a MySQL instance holding the dboe database. This database is used to extract the correspondent GeoJSON features for each toponym found in the previous step.
   When the script is not able to differenciate it will ask for user assistance, in order to discriminate between different possible options. 

1. ``node tustep.js ~/Documents/DBOE/TUSTEP/105_derived_xml`` -> places.json is generated.
2. ``NODE_CONFIG_DIR=../config node geolocalizator.js`` -> associate toponyms with GeoJSON features
3. ``NODE_CONFIG_DIR=../config node tustep-geo.js ~/Documents/DBOE/TUSTEP/105_derived_xml`` -> index TUSTEP data along with spatial, temporal or spatiotemporal dimensions (when available).
  

##Deployment
You can easily set up fast deployment to your own servers using [pm2](http://pm2.keymetrics.io/docs/usage/cluster-mode/).
pm2 employs JSON configuration files in order to do the deployment. We provide two example config stubs that you can tune up to your needs: ``ecosystem.json`` (for a
staging environment) and ``ecosystem-prod.json`` for a production one.
 
##Config files
In order to connect to the right endpoints depending on the environment we use the npm [config package](https://www.npmjs.com/package/config).
 Express will search for these files in the root and set variables accordingly. Example config files are placed under the [config](./config) folder 
  
**Be careful not to add these files to git as you would leak your passwords to the world! 🤦**

##Secure ElasticSearch
Whereas you can specify any host in the config files, it is a good practice that you secure your production environment, specially when you're hosting sensitive data.
In our setup we use [Search Guard Plugin](https://github.com/floragunncom/search-guard-ssl) for that purpose and JWT authentication. 
When a user logs in the system, a JSON Web Token is generated that will serve to sign requests to ElasticSearch on user's behalf. The key point is that you register 
users both in Passport.js and Search Guard with the same credentials. As of now there are no scripts to automate this task but you are very welcome to submit your PR!