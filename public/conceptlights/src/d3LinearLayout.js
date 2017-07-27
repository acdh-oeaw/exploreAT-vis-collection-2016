import * as d3 from 'd3';

export default function() {
  let data = {},
      sizeLength = 1,
      nodes = [];

  function linear() {
    // console.log('Hello');
    // console.log(data);
    // const levels = Object.keys(data).length,
    //       floorHeight = Math.ceil(size[1] / levels);

    // console.log(data);


    let numberOfGroups = 0;

    Object.keys(data).forEach(function(key) {
      if (parseInt(key) == 1) return;
      Object.keys(data[key]).forEach(function(nestedKey) {
        numberOfGroups += data[key][nestedKey].length;
      });
    });

    const xScale = d3.scaleLinear().domain([0, numberOfGroups -1]).range([0, sizeLength]);

    let i = 0,
        yFixed = 10;
    Object.keys(data).sort((a,b) => parseInt(a) - parseInt(b)).forEach(key => {
      if (parseInt(key) == 1) return;
      Object.keys(data[key]).forEach(nestedKey => {
        data[key][nestedKey].forEach((conceptsArray, j) => {
          nodes.push({
            id: `i${key}${nestedKey}${j}`,
            occurrences: parseInt(nestedKey),
            length: parseInt(key),
            name: conceptsArray.join('-'),
            x: xScale(i++),
            y: yFixed
          });
        });
      });
    });


    // for (let key in data) {
    //   if (key == 1) continue;
    //   for (let nestedKey in data[key]) {
    //     data[key][nestedKey].forEach((d) => {
    //       nodes.push({
    //         occurrences : parseInt(nestedKey),
    //         length: parseInt(key),
    //         name : d.join('-')
    //       });
    //     });
    //   }
    // }

    
    // const lenghts = Object.keys(data);
    // const numberOfLengths = lenghts.length;
    // const floorSize = size[1] / numberOfLengths;

    
    // let floor = 0;
    // lenghts.forEach(function(bla) {
    //   const numberOfNodesForLength = nodes.filter(function(d) {
    //     if (d.length == parseInt(bla)) {
    //       return true;
    //     } else {
    //       return false;
    //     }
    //   });

    //   // console.log(numberOfNodesForLength);
    //   const boxWidth = size[0] / numberOfNodesForLength.length;
    //   let indent = 0;
    //   nodes = nodes.map(function(d) {
    //     if (d.length == parseInt(bla)) {
    //       d.x = boxWidth * indent + boxWidth /2;
    //       d.y = floor * floorSize + floorSize / 2;
    //       indent++;
    //     }
    //     return d;
    //   });
    //   floor++;
    // });

    // const keys = Object.keys(data).sort((a,b) => parseInt(a) - parseInt(b))
    // for (let i = keys.length - 1; i > 1; i--) {
    //   const nestedKeys = Object.keys(data[keys[i]]).sort((a,b) => parseInt(a) - parseInt(b))
    //   for (let j = nestedKeys.length -1; i > 0; i--) {
    //     data[keys[i]][nestedKeys[j]].
    //     });
    //   }
    // }
    // console.log('Hello');
    // console.log(data)
    // console.log(nodes);
    return nodes;
  };

  linear.data = function (x) {
    if (!arguments.length) return data;
    data = x;
    return linear;
  };

  linear.sizeLength = function (x) {
    if (!arguments.length) return sizeLength;
    sizeLength = x;
    return linear;
  };

  return linear;
}
