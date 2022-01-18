if  (! (window.File && window.FileReader && window.FileList && window.Blob) ) {
    alert('The File APIs are not fully supported by your browser. The Randomizer may not function. Please upgrade to a modern browser.');
}

const checkRom = (data) => {
    const usHash = '4a8fbaf2d7386fed3915d16e2cf853b6'
    let hash = SparkMD5.hash(data + '', false)

    if (hash !== usHash) {
        console.log('Incorrect version!')
        return false
    } else {
        console.log('Rom ok!')
        return true
    }
}

const byteArrayToInt = function(byteArray) {
    let value = 0
    let byteMagnitude = 0
    let bytePlace = byteArray.length - 1

    for (let idx = 0; idx < byteArray.length; idx++) {
        byteMagnitude = Math.pow(2, bytePlace * 8)
        value += (byteMagnitude) * byteArray[idx];
        bytePlace -= 1
    }
    return value;
}


// NOTE: The current implementation does not handle RLE chunks
function patchRom(rom, patch) {

    eofBytes = [0x45, 0x4f, 0x46]

    const offsetHeaderLength = 3
    const payloadHeaderLength = 2
    
    let offsetInt = 0
    let payloadLengthInt = 0

    let payloadData = []

    const startingOffset = 5 // Skip magic number
    let curHunkOffset = startingOffset
    let endOfPatchFile = false

    let lastByteOffsetHeader = 0
    let lastBytePayloadHeader = 0

    let newRom = Object.values(rom)

    while (!endOfPatchFile) {
        lastByteOffsetHeader = curHunkOffset + offsetHeaderLength
        lastBytePayloadHeader = lastByteOffsetHeader + payloadHeaderLength

        offsetInt = byteArrayToInt(
            patch.slice(
                curHunkOffset,
                lastByteOffsetHeader
            )
        )

        payloadLengthInt = byteArrayToInt(
            patch.slice(
                lastByteOffsetHeader, 
                lastBytePayloadHeader
            )
        )

        /* Apply Patch */
        payloadData = patch.slice(lastBytePayloadHeader, lastBytePayloadHeader + payloadLengthInt)

        newRom.splice(offsetInt, payloadLengthInt, ...payloadData)

        curHunkOffset += offsetHeaderLength + payloadHeaderLength + payloadLengthInt

        if (byteArrayToInt(patch.slice(curHunkOffset, curHunkOffset + 3)) === byteArrayToInt(eofBytes)) {
            endOfPatchFile = true
        }
    }

    /* Convert array back to buffer */
    const patchedData = new Uint8Array(newRom)

    return patchedData // patchedData
}

const form = document.getElementById("randomizer-options")

const selectRomBtn = document.getElementById('rom-status-text')
const fileInput = document.getElementById("rom-file-input")
const randomizerOptionsContainer = document.getElementById("randomizer-options-container")
const randomizerButton = document.getElementById("randomize-btn")

let romData = new ArrayBuffer()
let ipsData = new ArrayBuffer()


/* Select ROM Button */
fileInput.addEventListener('change', function() {
    const file = this.files[0]
    const reader = new FileReader()

    reader.readAsArrayBuffer(file)

    reader.onload = function (event) {
        // Strip header?
        romData = new Uint8Array(event.target.result)
        if (checkRom(romData)) {
            selectRomBtn.innerHTML = "US version loaded!"
            randomizerOptionsContainer.classList.remove("hidden")
            randomizerButton.classList.remove("hidden")
            
        } else {
            selectRomBtn.innerHTML = "This version is not currently supported :("
            randomizerOptionsContainer.classList.add("hidden")
            randomizerButton.classList.add("hidden")
        }

    }

    reader.onerror = function(event) {
        console.log("Unable to read file.")
    }

})

/* Randomize Button */
const randomizeBtn = document.getElementById("randomize-btn")

randomizeBtn.addEventListener('click', () => {

    let randomizerOptions = {
        gameVersion: 'us11',
        tl: 768,
        pt: false,
        pe: false,
        nsc: false,
        nac: false,
        rm: false
    }

    let formData = Object.fromEntries(new FormData(form).entries())

    if (formData.timeLimit) randomizerOptions.tl = parseInt(formData.timeLimit)
    if (formData.persistentTime) randomizerOptions.pt = true
    if (formData.persistentEnergy) randomizerOptions.pe = true
    if (formData.noStartingContinues) randomizerOptions.nsc = true
    if (formData.noAddedContinues) randomizerOptions.nac = true
    if (formData.randomizeMaps) randomizerOptions.rm = true

    console.log(formData)
    console.log(JSON.stringify(randomizerOptions))

    /* Send randomizer options to the server */
    fetch('http://127.0.0.1:3000/randomize',
    {   
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },

        body: JSON.stringify(randomizerOptions),
    })
    .then(res => res.json())
    .then(obj => {
        ipsData = obj.data.data 

        /* Patch ROM */
        //console.log(ipsData)
        let patchedRomData = patchRom(romData, ipsData)

        const patchedRomBlob = new Blob([patchedRomData], {type:'application/octet-stream'}) // patchedRomData

        console.log("Blob created")

        console.log(`patchedRomBlob.size:${patchedRomBlob.size}`)
        const href = URL.createObjectURL(patchedRomBlob)

        console.log("URL created")

        const downloadLink = Object.assign(document.createElement('a'), {
            href,
            download:'SGR.sfc',
            style: 'display:none'
        })

        document.body.appendChild(downloadLink)
        downloadLink.click()

        URL.revokeObjectURL(href)
        downloadLink.remove()

        randomizerOptionsContainer.classList.add("hidden")
        randomizerButton.classList.add("hidden")

        selectRomBtn.innerHTML = "Click button below to select US v1.1 ROM"
        romData = 0
    })
})
