  /////////////////////
 // -> CONSTANTS <- //
/////////////////////

const c = 299792458.0;
const h = 6.62607015e-34;
const k = 1.380649e-23;

//////////////////
// -> PLANCK <- //
//////////////////

function planck(wavelength, temperature){
    const a = (2 * h * c * c) / (wavelength**5)
    const b = (h * c) / (wavelength * k * temperature)
    const B = a / (Math.exp(b) - 1)
    return B
}

/////////////////////
// -> BLACKBODY <- //
/////////////////////

export class BlackBody{
    constructor(temperature = 1000, diameter = 1000){
        this.temperature = temperature; // this.setTemperature(temperature);
        this.diameter = diameter;
        this.SpectralPowerDistribution = {};

    }

    setTemperature(temperature){
        this.temperature = temperature;

        for (let wavelength = 360; wavelength <= 830; wavelength++) {
            const intensity = planck(wavelength * 1e-9, this.temperature);
            this.SpectralPowerDistribution[wavelength] = intensity;
        }
    }

    getSpectralPowerDistribution(){
        // Create flat array with SPD
        let SPD = [];
        for (let [key, value] of Object.entries(this.SpectralPowerDistribution)){
            SPD.push(key, value);
        }
        SPD = new Float32Array(SPD);

        // Create empty matrix
        const SPDsMatrix = new Array(this.diameter+1);
        for (let i = 0; i < this.diameter+1; i++){
            SPDsMatrix[i] = new Array(this.diameter+1);
        }

        // Fill matrix with SPDs, making a circle
        for (let x = 0; x <= this.diameter; x++) {
            for (let y = 0; y <= this.diameter; y++) {
                if ( (x - this.diameter/2)**2 + (y - this.diameter/2)**2 <= (this.diameter/2)**2){
                    SPDsMatrix[x][y] = SPD;
                }
            }
        }
        console.log(SPDsMatrix);
        return SPDsMatrix;
    }
}

// const b = new BlackBody();
// b.setTemperature(800);
// console.log(b);
// console.log(b.temperature);
// console.log(b.SpectralPowerDistribution[500]);