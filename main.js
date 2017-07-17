/*jshint esversion: 6 */

const MAX = 10000;

/**
 * Euclidean distance
 */
function eudist(v1,v2,sqrt) {
	var len = v1.length;
	var sum = 0;

	for(let i=0;i<len;i++) {
		var d = (v1[i]||0) - (v2[i]||0);
		sum += d*d;
	}
	// Square root not really needed
	return sqrt? Math.sqrt(sum) : sum;
}

/**
 * Unidimensional distance
 */
function dist(v1,v2,sqrt) {
	var d = Math.abs(v1-v2);
	return sqrt? d : d*d;
}

function kmrand(data,k) {
	var map = {}, list = [];
	var ks = [], len = data.length

	for(let i=0;i<len;i++) {
		let d = data[i];
		var key = JSON.stringify(d);
		if(!map[key]) {
			map[key] = true;
			list.push(d);
		}
	};

	if(k>list.length) {
		throw new Error("Cluster size greater than distinct data points");
	}
	else {
		let l = list.length, m = {};
		while(ks.length<k) {
			let idx = Math.floor(Math.random()*l);
			if(!m[idx]) {
				m[idx] = true;
				ks.push(list[idx]);
			}
		}
	}

	return ks;
}

/**
 * K-means++ initial centroid selection
 */
function kmpp(data,k) {
	var dfn = data[0].length? eudist : dist;
	var ks = [], len = data.length;

	// First random centroid
	var c = data[Math.floor(Math.random()*len)];
	ks.push(c);

	// Retrieve next centroids
	while(ks.length<k) {
		// Min Distances
		let dists = data.map(v=>{
			// Return the min distance of v to current centroids
			let ksd = ks.map(c=>dfn(v,c));
			return Math.min.apply(this,ksd);
		});

		// Distance sum
		let dsum = dists.reduce((r,v)=>r+v,0);

		// Probabilities and cummulative prob (cumsum)
		let prs = dists.map((d,i)=>{return {i:i,v:data[i],pr:d/dsum}});
		prs.sort((a,b)=>a.pr-b.pr);
		prs.forEach((p,i)=>{p.cs = p.pr + (i>0? prs[i-1].cs : 0)});

		// Randomize
		let rnd = Math.random();

		// Gets only the items whose cumsum >= rnd
		let mprs = prs.filter(p=>p.cs>=rnd);

		// this is our new centroid
		ks.push(mprs[0].v);
	}

	return ks;
}

/**
 * Inits an array with values
 */
function init(len,val,v) {
	v = v || [];
	for(let i=0;i<len;i++) v[i] = val;
	return v;
}

function skmeans(data,k,initial,maxit) {
	var ks = [], old = [], idxs = [], dist = [];
	var conv = false, it = maxit || MAX;
	var len = data.length, vlen = data[0].length, multi = vlen>0;

	if(!initial) {
		for(let i=0;i<k;i++)
			ks.push(data[Math.floor(Math.random()*len)]);
	}
	else if(initial=="kmrand") {
		ks = kmrand(data,k);
	}
	else if(initial=="kmpp") {
		ks = kmpp(data,k);
	}
	else {
		ks = initial;
	}

	do {
		// For each value in data, find the nearest centroid
		for(let i=0;i<len;i++) {
			let min = Infinity, idx = 0;
			for(let j=0;j<k;j++) {
				// Multidimensional or unidimensional
				var dist = multi? eudist(data[i],ks[j]) : Math.abs(data[i]-ks[j]);
				if(dist<=min) {
					min = dist;
					idx = j;
				}
			}
			idxs[i] = idx;
		}

		// Recalculate centroids
		var count = [], sum = [], old = [], dif = 0;
		for(let j=0;j<k;j++) {
			// Multidimensional or unidimensional
			count[j] = 0;
			sum[j] = multi? init(vlen,0,sum[j]) : 0;
			old[j] = ks[j];
		}

		// If multidimensional
		if(multi) {
			for(let j=0;j<k;j++) ks[j] = [];

			// Sum values and count for each centroid
			for(let i=0;i<len;i++) {
				let idx = idxs[i],	// Centroid for that item
					vsum = sum[idx],	// Sum values for this centroid
					vect = data[idx];	// Current vector

				// Accumulate value on the centroid for current vector
				for(let h=0;h<vlen;h++) {
					vsum[h] += vect[h];
				}
				count[idx]++;	// Number of values for this centroid
			}
			// Calculate the average for each centroid
			conv = true;
			for(let j=0;j<k;j++) {
				let ksj = ks[j],	// Current centroid
					sumj = sum[j],	// Accumulated centroid values
					oldj = old[j], 	// Old centroid value
					cj = count[j];	// Number of elements for this centrois

				// New average
				for(let h=0;h<vlen;h++) {
					ksj[h] = sumj[h]/cj || 0;	// New centroid
				}
				// Find if centroids have moved
				if(conv) {
					for(let h=0;h<vlen;h++) {
						if(oldj[h]!=ksj[h]) {
							conv = false;
							break;
						}
					}
				}
			}
		}
		// If unidimensional
		else {
			// Sum values and count for each centroid
			for(let i=0;i<len;i++) {
				let idx = idxs[i];
				sum[idx] += data[i];
				count[idx]++;
			}
			// Calculate the average for each centroid
			for(let j=0;j<k;j++) {
				ks[j] = sum[j]/count[j] || 0;	// New centroid
			}
			// Find if centroids have moved
			conv = true;
			for(let j=0;j<k;j++) {
				if(old[j]!=ks[j]) {
					conv = false;
					break;
				}
			}
		}

		conv = conv || (--it<=0);
	}while(!conv);

	return {
		it : MAX-it,
		k : k,
		idxs : idxs,
		centroids : ks
	};
}

module.exports = skmeans;
