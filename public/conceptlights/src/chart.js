
import * as d3 from 'd3';
import adjacencyMatrixLayout from './d3AdjacencyMatrixLayout';
import stratumLayout from './d3StratumLayout';
import linearLayout from './d3LinearLayout';
import * as scaleChromatic from 'd3-scale-chromatic';
import * as d3tip from 'd3-tip';
import * as _  from 'underscore';
// import Grid from 'd3-v4-grid';

export default function (data) {
            const svg = d3.select("svg"),
              size = canvasSize('svg'),
              width = size[0],
              height = size[1];

            const mside = (0.9 * size[1]) / Math.sqrt(2);
            //hyp = sqrt(2)*c
            const matrixSize = [mside, mside];
            console.log(adjacencyMatrixLayout);

            const adjacencyMatrix = adjacencyMatrixLayout();

            const conceptsSize = [size[0] - 250 - 0.9 * size[1], 0.9 * size[1]]

            // console.log(size, matrixSize, conceptsSize); 

            adjacencyMatrix
                .size(matrixSize)
                .nodes(data.nodes)
                .links(data.links)
                .edgeWeight(d => d.weight)
                .directed(false)
                .nodeID(d => d.id);

            const matrixData = adjacencyMatrix();


            // const someColors = d3.scaleOrdinal()
            //     .range(d3.schemeCategory20b);
            // const someColors = d3.scaleThreshold()
            //                     .domain(d3.extent(data.links, (d) => d.weight))
            //                     .range(["white", "blue", "red"]);

            const someColors = d3.scaleSequential(scaleChromatic.interpolateReds).domain([0, d3.max(data.links, (d) => d.weight)]);

            // console.log(someColors(0), someColors(1),someColors(2),someColors(3),someColors(4));

            // const defaultOpacity = (d) => {
            //     return 0.3 + 0.2 * d.weight;
            // };

            
            // Define the div for the tooltip
            const tooltip = d3tip().attr('class', 'd3-tip').offset([-10, 0]);

            svg.call(tooltip);


            const matrixMaxX = d3.max(matrixData, d => d.x);
            const matrixMaxY = d3.max(matrixData, d => d.y);
            

            console.log(matrixMaxX, matrixMaxY);

            const squareSize = [matrixData[0].width, matrixData[0].height];

            
            svg
              .append('g')
                .attr('transform', `translate(${size[0] * 0.05}, 20)`)
                .attr('id', 'adjacencyG')
                .selectAll('rect')
                .data(matrixData)
                .enter()
                .append('rect')
                  .attr('width', d => d.width)
                  .attr('height', d => d.height)
                  .attr('class', d => {
                    if (d.x < d.y)
                      return `row-${d.id.split('-')[0]} column-${d.id.split('-')[1]}`;
                    else
                      return `row-${d.id.split('-')[1]} column-${d.id.split('-')[0]}`;
                  })
                  .attr('id', d => d.id)
                  .attr('x', d => d.x)
                  .attr('y', d => d.y)
                  .style('stroke', 'black')
                  .style('stroke-width', '1px')
                  .style('stroke-opacity', .1)
                  .style('fill', d => someColors(d.weight))
                  .style('fill-opacity', 0.5)
                  .on("mouseover", mouseover)
                  .on("mouseout", function(p) {
                    const regex = /row-(\S*)/g;
                    const currentGroupID = regex.exec(d3.select(this).attr('class'))[1];
                    d3.selectAll(`.link[id^="${currentGroupID}-"]`)
                      .style('stroke-opacity', .03);
                    unhighlight();
                  })
                  .on("click", function(p) {
                    const data = d3.select(this).data()[0];
                    const setA = new Set(data.source.concepts),
                          setB = new Set(data.target.concepts);
                    const intersection = new Set([...setA].filter(x => setB.has(x)));
                    console.log(setA, setB, Array.from(intersection));
                  });

            d3.select('#adjacencyG')
                .call(adjacencyMatrix.xAxis);

            // d3.select('g.am-xAxis.am-axis')
            //   .selectAll('text')
            //     .attr('transform', 'translate(10, -20)rotate(-90)');

            d3.select('#adjacencyG')
                .call(adjacencyMatrix.yAxis);


            const extractedConcepts = data.nodes.map((d) => d.concepts).reduce((a, b) => a.concat(b));

            const conceptsMap = {};
            extractedConcepts.forEach((d) => {
              if (conceptsMap.hasOwnProperty(d))
                conceptsMap[d] += 1;
              else
                conceptsMap[d] = 1
            })

            const reversedConceptsMap = reverseMapFromMap(conceptsMap);

            
            const concepts = Array.from(new Set(extractedConcepts));

            const conceptsData = concepts.map(function (d) { return {concept : d}});


            const stratum = stratumLayout()
                              .data(reversedConceptsMap)
                              .size([(size[0] - 0.95 * size[1]) / 2, 1.01 * matrixSize[0]]);

            const stratumData = stratum();

            let questionnaireStratum = data.nodes.map(node => {
              return node.concepts.map(concept => {
                const index = _.findIndex(stratumData.nodes, d => d.name == concept);
                return { 
                  index : index,
                  level: stratumData.nodes[index].level,
                  questionnaireID: node.id
                };
              });
            });

            console.log(questionnaireStratum);



           function mouseover(p) {
              const setA = new Set(p.source.concepts),
                          setB = new Set(p.target.concepts);
              const intersection = new Set([...setA].filter(x => setB.has(x)));
              
              const message = intersection.size > 0 ? Array.from(intersection).join(', ') : 'None';
              tooltip.html(message);
              tooltip.show();

              d3.selectAll("rect")
                  .classed("active", (d, i) => { return d.y == p.y || d.x == p.x; })
                  // .classed('active', (d, i) => { return d.x == p.x; })
                  .style('fill-opacity', (d, i) => { 
                      return d.y == p.y || d.x == p.x ? 1 : 0.5;
                  }).filter(d => d.x == p.x && d.y == p.y)
                    .each(d => {
                      let colQuestionnaireIndex = -1,
                          rowQuestionnaireIndex = -1,
                          idParts = d.id.split('-')
                      if (p.x < p.y) {
                        rowQuestionnaireIndex = getQuestionnaireIndexFromID(idParts[0]);
                        colQuestionnaireIndex = getQuestionnaireIndexFromID(idParts[1]);
                      } else {
                        rowQuestionnaireIndex = getQuestionnaireIndexFromID(idParts[1]);
                        colQuestionnaireIndex = getQuestionnaireIndexFromID(idParts[0]);
                      }


                      d3.selectAll(`[id^=line-${colQuestionnaireIndex}-]`)
                        .style('stroke-opacity', 1)
                        .each(function(d) {
                          const targetGroupID = 'i' + d3.select(this).attr('id').split('-')[2];
                          d3.select(`#${targetGroupID}`).style('fill-opacity', 1);
                      });

                      data.nodes[rowQuestionnaireIndex].concepts.forEach(concept => {
                        d3.select(`circle[id^=${concept}-]`)
                          .style("opacity", 1);
                      })
                  });
              
              const regex = /row-(\S*)/g;
              const currentGroupID = regex.exec(d3.select(this).attr('class'))[1];
              d3.selectAll(`.link[id^="${currentGroupID}-"]`)
                .style('stroke-opacity', 1.0);

            };

            function unhighlight() {
                
                tooltip.hide();
                d3.selectAll("rect")
                  .classed("active", false)
                  .style('fill-opacity', 0.5);
                d3.selectAll(`[id^=line]`)
                        .style('stroke-opacity', .1);
                d3.selectAll("[id^=i]")
                        .style('fill-opacity', .3);
                d3.selectAll(".concept-circle")
                          .style("opacity", .3);
            };

            

            // console.log(stratumData);

            const color = d3.scaleOrdinal(scaleChromatic.schemeAccent);
            const termsRadiusScale = d3.scaleLinear()
                                    .domain([1, Object.keys(reversedConceptsMap).length - 1])
                                    .range([3,8]);
            const sortedKeys = Object.keys(reversedConceptsMap).sort((a,b) => parseInt(a) > parseInt(b));
            // console.log(stratumData);


            function highlightSquaresIncludingConcepts(concepts) {
              const selection = svg.select('#adjacencyG').selectAll('rect').filter(function(d, i){
                              
                              if (d.weight > 0) {
                                if (!d.isMirror)
                                  return _.intersection(d.source.concepts, concepts).length > 0;
                                else
                                  return _.intersection(d.target.concepts, concepts).length > 0;
                              } else return 0;
                            }).transition()
                                .duration(100)
                                .style("fill-opacity", 1);
            };

            function unhighlightAllSquares() {
              d3.selectAll("rect").style('fill-opacity', 0.5);
            }

            const conceptsContext = d3.select('svg')
                .append('g')
                    .attr('transform', `translate(${350 + size[0] * 0.05 + matrixSize[0]}, ${0.06 * matrixSize[0]})`)
                    .attr('id', 'conceptsA');

            

            const groupsCount = _.groupBy(stratumData.nodes, "level");


            conceptsContext
                    .selectAll('g')
                    .data(stratumData.nodes)
                    .enter()
                      .append("circle")
                          .attr("cx", d => d.x)
                          .attr("cy", d => d.y)
                          .attr("class", "concept-circle")
                          .attr("id", d => `${d.name}-${d.level}`) 
                          .attr("r", d => 5)
                          .style("fill", d => { return color(d.level); })
                          .style("opacity", d => 0.3)
                          .on("mouseover", function(c) {
                            tooltip.html(c.name);
                            tooltip.show();
                            d3.select(this).style('opacity', 1);
                            console.log(c);
                            highlightSquaresIncludingConcepts([c.name]);
                            d3.select(`#group-${c.level}`)
                              .style('fill-opacity', function (d) {
                                  const previous = parseFloat(d3.select(this).style('fill-opacity'));
                                  return parseFloat(previous) + 1 / groupsCount[c.level].length;
                              });
                            
                            d3.selectAll(`.link[id$="-${c.level}-${c.index}"]`)
                              .style('stroke-opacity', 1.0);
                          })
                          .on("mouseout", function(c) {
                            tooltip.hide();
                            // d3.selectAll("*").interrupt();
                            d3.select(this).style("opacity", .3);
                            d3.selectAll(`.link[id$="-${c.level}-${c.index}"]`)
                              .style('stroke-opacity', .03);
                            unhighlightAllSquares();
                          })
                          .on("click", function(d) {
                            d3.selectAll("*").interrupt();
                            d3.select(this)
                              .classed('active');
                          });
            
            conceptsContext
                      .selectAll('g')
                      .data(stratumData.groups)
                      .enter()
                        .append('rect')
                        .attr("x", 0)
                        .attr("y", d => d.startY)
                        .attr("id", d => `group-${d.group}`)
                        .attr("width", 12)
                        .attr("height", d => d.endY - d.startY)
                        .style('fill', d => color(d.group))
                        .style('fill-opacity', 0.5)
                        .on('mouseover', function (c) {
                            tooltip.html(`Appearing ${c.group} times`);
                            tooltip.show();
                            console.log(c);
                            d3.select(this).style('fill-opacity', 1);
                            const concepts = [];
                            d3.selectAll(`circle[id$="-${c.group}"]`)
                              .style("opacity", 1)
                              .each(d => {concepts.push(d.name);});
                            highlightSquaresIncludingConcepts(concepts);
                            d3.selectAll(`.link[id*="-${c.group}-"]`)
                              .style('stroke-opacity', 1.0);

                            // .attr("id", `link-${destObject.questionnaireID}-${destObject.level}-${destObject.index}`)

                        })
                        .on('mouseout', function (c) {
                            tooltip.hide();
                            d3.select(this).style('fill-opacity', .5);
                            d3.selectAll(`circle[id$="-${c.group}"]`)
                              .style("opacity", .3);
                            d3.selectAll(`.link[id*="-${c.group}-"]`)
                              .style('stroke-opacity', .03);
                            unhighlightAllSquares();
                        });

            // svg.append('path')
            //     .style('stroke', 'green')
            //     .attr('d', generator(points))
            //     .style('display', 'inline');

            // const ribbon = d3.ribbon().radius(240);

            // svg.append("g")
            //     .attr("class", "ribbons")
            //   .selectAll("path")
            //   .data([{
            //     source: {startAngle: 0.7524114, endAngle: 1.1212972, radius: 240},
            //     target: {startAngle: 1.8617078, endAngle: 1.9842927, radius: 240}
            //   }])
            //   .enter().append("path")
            //     .attr("d", ribbon)
            //     .style("fill", function(d) { return "yellow"})
            //     .style("stroke", function(d) { return "blue" });


      
            

            const linear  = linearLayout()
                              .data(data.coincident_groups)
                              .sizeLength(mside);
            const linearData = linear();

            
            d3.extent(linearData, node => node.occurrences);
            const radiusScale = d3.scaleLinear()
                                    .domain(d3.extent(linearData, node => node.occurrences))
                                    .range([5,8]);

            svg
              .append('g')
                  .attr('transform', `translate(${size[0] * 0.05}, ${0.90 * size[1]})`)
                  .attr('id', 'conceptsG')
                  .selectAll('g')
                  .data(linearData)
                  .enter()
                  .append('g')
                    .append('circle')
                      .attr("cx", d => d.x)
                      .attr("cy", d => d.y)
                      .attr("id", d => d.id)
                      .attr("r", d => radiusScale(d.occurrences))
                      .style("fill", d => someColors(d.length))
                      .style("fill-opacity", 0.3)
                      .on("mouseover", function (p) {
                        
                        tooltip.html(p.name);  
                        tooltip.show();

                        const thisSelect = d3.select(this);
                        thisSelect.style('fill-opacity', 1);
                        const groupID = thisSelect.attr('id').replace('i','');
                        d3.selectAll(`.association-line[id$="-${groupID}"]`)
                          .style('stroke-opacity', 1)
                          .each(function(d) {
                            const questionnaireIndex = d3.select(this).attr('id').split('-')[1];
                            const questionnaireID = data.nodes[questionnaireIndex].id;
                            d3.selectAll(`[class$=column-${questionnaireID}]`)
                              .style('fill-opacity', 1);
                          });
                        })
                      .on("mouseout", unhighlight);

            drawLinks();

            
            // questionnaireStratum = _.sortBy(questionnaireStratum, d => d[0].questionnaireID);
            console.log(questionnaireStratum);
            questionnaireStratum = questionnaireStratum.sort(function(a, b) {
              return naturalCompare(a[0].questionnaireID, b[0].questionnaireID);
            });
            console.log(questionnaireStratum);

            const generator = d3.line().curve(d3.curveBundle.beta(0.2));

            d3.selectAll(`.column-${data.nodes[data.nodes.length - 1].id}`)
              .filter(d => d.isMirror)
              .each(function (d, i) {
                  const thisItem = d3.select(this);
                  const x = thisItem.attr("x");
                  const y = thisItem.attr("y");
                  const prevThis = this;
                  questionnaireStratum[i].forEach(destObject => {
                      
                      const newPoint_A = transformPointToScreenCoordinates(x, y, prevThis.getCTM());
                      const targetNode = d3.select('#conceptsA').select(`rect#group-${destObject.level}`);
                      const targetX = 0;
                      const targetY = parseInt(targetNode.attr("y")) + parseInt(targetNode.attr("height")) / 2;
                      const newPoint_B = transformPointToScreenCoordinates(targetX, targetY, targetNode.node().getCTM());
                      // console.log(targetX, targetY, targetNode, newPoint_A, newPoint_B);
                      const lineColor = targetNode.style('fill');
                      svg.append('line')
                        .attr("id", `${destObject.questionnaireID}-${destObject.level}-${destObject.index}`)
                        .attr("class", 'link')
                        .attr("x1", newPoint_A.x + squareSize[0])
                        .attr("y1", squareSize[1] / 2 + newPoint_A.y)
                        .attr("x2", newPoint_B.x)
                        .attr("y2", newPoint_B.y)
                        .attr("stroke-width", 1)
                        .attr("stroke", lineColor)
                        .style('stroke-opacity', .03);

                  });
              })
            // svg.selectAll('arc.path')
            //     .data(_.flatten(questionnaireStratum))
            //     .enter()
            //       .append('path')
            //       .style('stroke', 'green')
            //       .attr('d', (d, i) => {
            //           const points = [];
            //           console.log(d.questionnaireID);
            //           const qCell = lastColumnElements.filter(`.row-${d.questionnaireID}`);
            //           console.log(qCell.attr('x'));
            //       })
            //       .style('display', 'inline');

            // const points = [ [50, 330], [75, 200], [280, 75], [300, 75], [475, 300], [600, 200] ];
            
            // console.log(generator(points));



            function getQuestionnaireIndexFromID(questionnaireID) {
              for (let i = 0; i < data.nodes.length; i++) {
                if (data.nodes[i].id == questionnaireID) {
                  return i;
                }
              }
              return -1;
            }

            function drawLinks() {

              const lastID = data.nodes[data.nodes.length -1].id;

              // Traverse questionnaires
              
          
              // Calculate control points

              // const matrixTransform = getTransformation(d3.select('#adjacencyG').attr("transform"));
              // const linearTransform = getTransformation(d3.select('#conceptsG').attr("transform"));
              // console.log(matrixTransform); 

              const matrixG = d3.select('#adjacencyG')
                          matrixG 
                              .selectAll(`[id^=${lastID}]`)
                              .filter(d => !d.isMirror)
                              .each(function(d, i){
                                // For each questionnaire calculate position in matrix
                                let questionnaireIdx = getQuestionnaireIndexFromID(d.id.split('-')[1])

                                const targetGroups = {};
                                for (i = 0; i < data.links.length; i++) {
                                  if ((data.links[i].source == questionnaireIdx || 
                                      data.links[i].target == questionnaireIdx) && data.links[i].weight > 1) {
                                    const groupID = data.links[i].target_group.join('')
                                    if (targetGroups.hasOwnProperty(groupID)) {
                                      targetGroups[groupID] += 1;
                                    }
                                    else {
                                      targetGroups[groupID] = 1;
                                    }
                                  }
                                }

                                const thisItem = d3.select(this);
                                const x = thisItem.attr("x");
                                const y = thisItem.attr("y");

                                Object.keys(targetGroups).forEach(targetGroupID => {
                                  const reps = targetGroups[targetGroupID];

                                  const newPoint_A = transformPointToScreenCoordinates(x, y, this.getCTM())
                                  
                                  const targetNode = d3.select('#conceptsG').select('#i'+targetGroupID);
                                  const targetX = targetNode.attr("cx");
                                  const targetY = targetNode.attr("cy");
                                  const newPoint_B = transformPointToScreenCoordinates(targetX, targetY, targetNode.node().getCTM());

                                  svg.append('line')
                                    .attr("class", "association-line")
                                    .attr("id", `line-${questionnaireIdx}-${targetGroupID}`)
                                    .attr("x1", squareSize[0] / 2 + newPoint_A.x)
                                    .attr("y1", squareSize[1] + newPoint_A.y)
                                    .attr("x2", newPoint_B.x)
                                    .attr("y2", newPoint_B.y)
                                    .attr("stroke-width", 1)
                                    .attr("stroke", "lightgray")
                                    .style('stroke-opacity', .1);
                                });

                                // Calculate destination point
                                // console.log(this.getScreenCTM(), x, y);
                                
                              });

            };


            function transformPointToScreenCoordinates(x, y, ctm) {
                const newPoint = document.getElementsByTagName('svg')[0].createSVGPoint();
                newPoint.x = x;
                newPoint.y = y;
                return newPoint.matrixTransform(ctm);
            }


            function id(x) {return x;};

            function reverseMapFromMap(map, f) {
              return Object.keys(map).reduce(function(acc, k) {
                acc[map[k]] = (acc[map[k]] || []).concat((f || id)(k))
                return acc
              },{})
            };

            function mapFromReverseMap(rMap, f) {
              return Object.keys(rMap).reduce(function(acc, k) {
                rMap[k].forEach(function(x){acc[x] = (f || id)(k)})
                return acc
              },{})
            };

            function naturalCompare(a, b) {
                var ax = [], bx = [];

                a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
                b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
                
                while(ax.length && bx.length) {
                    var an = ax.shift();
                    var bn = bx.shift();
                    var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
                    if(nn) return nn;
                }

                return ax.length - bx.length;
            }

            // function getTransformation(transform) {
            //   // Create a dummy g for calculation purposes only. This will never
            //   // be appended to the DOM and will be discarded once this function 
            //   // returns.
            //   var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
              
            //   // Set the transform attribute to the provided string value.
            //   g.setAttributeNS(null, "transform", transform);
              
            //   // consolidate the SVGTransformList containing all transformations
            //   // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
            //   // its SVGMatrix. 
            //   var matrix = g.transform.baseVal.consolidate().matrix;
              
            //   // Below calculations are taken and adapted from the private function
            //   // transform/decompose.js of D3's module d3-interpolate.
            //   var {a, b, c, d, e, f} = matrix;   // ES6, if this doesn't work, use below assignment
            //   // var a=matrix.a, b=matrix.b, c=matrix.c, d=matrix.d, e=matrix.e, f=matrix.f; // ES5
            //   var scaleX, scaleY, skewX;
            //   if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
            //   if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
            //   if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
            //   if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
            //   return {
            //     translateX: e,
            //     translateY: f,
            //     rotate: Math.atan2(b, a) * 180 / Math.PI,
            //     skewX: Math.atan(skewX) * 180 / Math.PI,
            //     scaleX: scaleX,
            //     scaleY: scaleY
            //   };
            // }

};

// const makeHierarchy = (nodes) => {
//   const keys = Object.keys(nodes).sort((a,b) => parseInt(a) - parseInt(b)),
//         hierarchy = {};
//   let rootNode;

//   const rootLevel = nodes[keys[keys.length - 1]];

//   const rootObject = {
//     name : rootLevel[0]
//     level : keys.length - 1
//     children : []
//   };

//   if (rootLevel.length > 1) {
//     //Just pick one
    
//     for (let i = 1; i < rootLevel.length; i++) {
//         rootObject.children.push({
//           name : rootLevel[0]
//           level : keys.length - 1
//           children : []
//         });
//     }
//   } else {
//     rootNode = rootLevel[0]
//   }

//   keys.forEach((key, i) => {
//     const concepts = nodes[key];
//     concepts.forEach((d) => {
//       const conceptObject = {};
//       conceptObject.name = d;
//       conceptObject.level = i;
//       conceptObject.children = keys[i+1]
//     })
//   });
// };


const canvasSize = (targetElement) => {
                var height = parseFloat(d3.select(targetElement)
                .node().clientHeight);
                var width = parseFloat(d3.select(targetElement).node().clientWidth);
                return [width,height];
          };