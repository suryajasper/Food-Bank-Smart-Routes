const {init2D} = require('./utils');
const {distanceMatrix} = require('./apis');

function randF(min,max){
  return Math.random()*(max-min)+min;
}

function randCoords(num) {
  let coords = [];
  for (let _ = 0; _ < num; _++) {
    coords.push({
      latitude  : parseFloat( randF(37.5, 38).toFixed(4) ),
      longitude : parseFloat( randF(-122.5, -122).toFixed(4) ),
    });
  }
  return coords;
}


function mutate(arr1, arr2) {
  let res = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      res.push(arr1[i]-arr2[j]);
    }
  }
  return res;
}

const N      = parseInt(process.argv[2]);
const STRIDE = parseInt(process.argv[3]);

let coords = randCoords(N);
console.log(coords);

async function doShit() {
  const matrix = init2D(N, N);
  
  let iter = 1;
  
  for (let rStart = 0; rStart < N; rStart += STRIDE) {
    for (let cStart = 0; cStart < N; cStart += STRIDE) {
  
      input = [coords.slice(rStart, rStart+STRIDE), coords.slice(cStart, cStart+STRIDE)];
  
      // console.log( `${rStart} - ${Math.min(N, rStart+STRIDE)} into ${cStart} - ${Math.min(N, cStart+STRIDE)}` );
      
      const flattened = (await distanceMatrix(...input)).body.resourceSets[0].resources[0].results.map(el => el.travelDuration);
  
      for (let r = rStart; r < Math.min(N, rStart+STRIDE); r++) {
        for (let c = cStart; c < Math.min(N, cStart+STRIDE); c++) {
          // console.log(iter, '.', r, c, '->', r%STRIDE*input[1].length+c%STRIDE);
          matrix[r][c] = flattened[r%STRIDE*input[1].length+c%STRIDE];
        }
      }
      
      iter++;
  
    }
  }

  return matrix;
}

doShit().then(console.log).catch(console.error);

//console.log(matrix);