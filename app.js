const {
  Scale,
  Midi,
  Chord
} = require("tonal");

const MidiWriter = require('midi-writer-js');
const fs = require('fs');
const yargs = require('yargs');
const hideBin = require('yargs/helpers').hideBin;
const easymidi = require('easymidi');
const prompt = require('prompt-sync')();

const argv = parseCommandLineArguments();

const {
  arp,
  noteSpread,
  randomizeNoteSpread,
  bpm,
  phraseCount,
  playChords,
  velocity,
  channel,
  phraseNotesCount,
  noteLengths,
  timeSignature,
  minOctave,
  maxOctave,
  skipNotesChance,
  key,
  mode,
  scale,
  chords,
  keyRange,
  fileName,
  outputPath,
  generateMidiStream
} = argv;



const track = new MidiWriter.Track()
track.setTempo(bpm);



function parseCommandLineArguments() {
  let argv = yargs(hideBin(process.argv)).argv;

  function getNoteLengthsConfig() {

    const switchToTripletChance = argv.triplet_chance || 0.0; // 0% chance to switch to triplet note durations

    function randomTripletNoteDuration(duration) {
      if (Math.random() < switchToTripletChance) {
        return duration + "t";
      }
      return duration;
    }

    switch (true) {
      case typeof argv.note_durations == "array":
        return argv.note_durations.map(randomTripletNoteDuration);
      case typeof argv.note_durations == "string":
        return argv.note_durations
          .split(",")
          .map(String)
          .map(randomTripletNoteDuration);
      case typeof argv.note_durations == "number":
        return [argv.note_durations].map(String).map(randomTripletNoteDuration);
      case typeof argv.note_durations == "undefined":
        return ["16", "8"].map(randomTripletNoteDuration);
    }
  }

  const noteLengths = getNoteLengthsConfig();

  return {
    arp: argv.arp || "",
    noteSpread: argv.note_spread || 1,
    randomizeNoteSpread: argv.randomize_note_spread || false,
    bpm: argv.bpm || 120,
    noteLengths,
    phraseCount: argv.phrase_count || 1,
    playChords: argv.play_chords || false,
    velocity: Number(argv.velocity) || 127,
    channel: Number(argv.midi_channel) || 1,
    phraseNotesCount: argv.phrase_notes_count || 32,
    timeSignature: argv.time_signature || "4/4",
    minOctave: argv.min_octave || 1,
    maxOctave: argv.max_octave || 5,
    skipNotesChance: parseFloat(argv.skip_notes_chance) || parseFloat(0.0),
    key: argv.key || "C",
    mode: argv.mode || "major",
    scale: `${argv.key || "C"} ${argv.mode || "major"}`,
    chords: Scale.scaleChords(`${argv.key || "C"} ${argv.mode || "major"}`),
    keyRange: Scale.rangeOf(`${argv.key || "C"} ${argv.mode || "major"}`)(`${argv.key || "C"}${argv.min_octave || 1}`, `${argv.key || "C"}${argv.max_octave || 5}`),
    fileName: argv.file_name || `${argv.key || "C"}-${argv.mode || "major"}-midi-file-${(new Date()).toISOString()}.mid`,
    outputPath: argv.output_path || './',
    generateMidiStream: argv.generate_midi_stream || "true"
  };
}

function printConfiguration() {
  console.log(`bpm: ${bpm}`);
  console.log(`phrase count: ${phraseCount}`);
  console.log(`velocity: ${velocity}`);
  console.log(`midi channel: ${channel}`);
  console.log(`phrase notes count: ${phraseNotesCount}`);
  console.log(`note durations: ${noteLengths}`);
  console.log(`time signature: ${timeSignature}`);
  console.log(`min octave: ${minOctave}`);
  console.log(`max octave: ${maxOctave}`);
  console.log(`skip beats chance: ${(skipNotesChance * 100).toFixed(2)}%`);
  console.log(`scale: ${scale}`);
  console.log(`key range: ${keyRange}`);
}

printConfiguration();

// sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getNotesPerBeat(noteDuration) {
  switch (noteDuration) {
    // whole note
    case "1":
      return 0.25
    // half note
    case "2":
      return 0.5
    // dotted half note
    case "d2":
      return 0.875
    // quarter note
    case "4":
      return 1
    // triplet quarter note
    case "4t":
      return 1.5
    // dotted quarter note
    case "d4":
      return 1.5
    case "dd4":
      return 1.75
    // eighth note
    case "8":
      return 2
    // triplet eighth note
    case "8t":
      return 3
    // dotted eighth note
    case "d8":
      return 3
    case "dd8":
      return 3.5
    // sixteenth note
    case "16":
      return 4
    // triplet sixteenth note
    case "16t":
      return 6
    // thirty-second note
    case "32":
      return 8
    // sixty-fourth note
    case "64":
      return 16
  }
}

function generateArpeggio(midiNotes, direction) {
  if (direction === "u") {
    return midiNotes.sort((a, b) => a - b);
  } else if (direction === "d") {
    return midiNotes.sort((a, b) => b - a);
  } else if (direction === "ud") {
    const up = midiNotes.sort((a, b) => a - b);
    const down = midiNotes.slice().sort((a, b) => b - a);
    return up.concat(down);
  }
  return midiNotes;
}

const timeSignatureArr = timeSignature.split("/")
const timeSignatureTop = timeSignatureArr[0]
const timeSignatureBottom = timeSignatureArr[1]
const notesPerBeat = getNotesPerBeat(noteLengths[0])
const notesPerMeasure = timeSignatureTop * notesPerBeat
console.log(`notes per measure: ${notesPerMeasure}`)


// set skip beats chance
// set to float

const percentage = (skipNotesChance * 100).toFixed(2)
console.log(`skip beats chance: ${percentage}%`)


// function that selects a random chord from the chords const
function getRandomChord() {
  let randomOctave = Math.floor(Math.random() * (maxOctave - minOctave + 1)) + minOctave;
  let randomChord = chords[Math.floor(Math.random() * chords.length)];
  let chordNotes = Chord.getChord(randomChord, key)['notes']
  let chordNotesLength = chordNotes.length
  let chordMidiNotes = []
  // pick a random set of notes from chordNotes with a min of 1 and max of noteSpread
  let noteCount = randomizeNoteSpread ? Math.floor(Math.random() * (noteSpread - 1 + 1)) + 1 : noteSpread
  let randomChordNotes = []
  // pick random notes from chordNotes
  for (let i = 0; i < noteCount; i++) {
    let randomNote = chordNotes[Math.floor(Math.random() * chordNotes.length)];
    randomChordNotes.push(randomNote)
  }
  for (note of randomChordNotes) {
    let midiNote = Midi.toMidi(`${note}${randomOctave}`)
    chordMidiNotes.push(midiNote)
  }
  return {
    randomChordNotes,
    chordMidiNotes,
    randomChord,
    randomOctave,
    chordNotesLength
  }
}

var outputs = easymidi.getOutputs();

// if no outputs are found, create one
if (outputs.length === 0) {
  console.log('No outputs found!, initializing one');
  output = new easymidi.Output('Midi Generator', true);

  // if more than one is found, use that one
} else if (outputs.length > 1) {
  console.log('Multiple outputs found!, please select one');
  for (let i = 0; i < outputs.length; i++) {
    let number = i + 1;
    console.log(`${number} - ${outputs[i]}`);
  }
  const selectedOutput = prompt('Select an output: ');
  select = Number(selectedOutput) - 1;
  var output = new easymidi.Output(outputs[select]);

  // if only one is found, use that one
} else {
  var output = new easymidi.Output(outputs[0]);
}
// var output = new easymidi.Output('Midi Generator', true);
output.send('clock');
output.send('start');


function getNoteDurationInMs(noteDuration) {
  const beatDurationInMs = (60 * 1000) / bpm;
  const notesPerBeat = getNotesPerBeat(noteDuration);
  return beatDurationInMs / notesPerBeat;
}


// function that sends midi notes
async function sendMidi(midiNotes, notes, velocity, channel, noteDuration, chordName) {

  if (!playChords) {
    console.log(`${notes}`)
  } else {
    console.log(`${key} ${chordName} (${notes})`)
  }
  // send noteon signals for all notes in the chord
  midiNotes.forEach((midiNote, i) => {
    output.send("noteon", {
      note: midiNote,
      velocity: velocity,
      channel: channel,
    });
  });

  // wait for the noteDuration time
  await sleep(noteDuration);

  // send noteoff signals for all notes in the chord
  midiNotes.forEach((midiNote, i) => {
    output.send("noteoff", {
      note: midiNote,
      velocity: velocity,
      channel: channel,
    });
  });

}

// function that creates randomly sized smaller arrays that fluctuate in length between 1 and the noteSpread value
function randomIndex(items) {
  let note = items[items.length * Math.random() | 0];
  let midiNote = Midi.toMidi(note)
  let obj = {
    note,
    midiNote
  }
  return obj
}

// function that returns a random note from a range
const randomNote = (range) => {
  let notes = [];
  let midiNotes = [];
  // variable that sets to a random value between 1 and the noteSpread value
  const ns = noteSpread;
  // loop through the noteSpread value and push a random note to the notes array

  for (let i = 0; i < ns; i++) {
    if (i === 0 || Math.random() < 1 / ns) {
      let res = randomIndex(range);
      let note = res["note"];
      let midi = res["midiNote"];
      notes.push(note);
      midiNotes.push(midi);
    }
  }
  return {
    notes,
    midiNotes,
  };
};


// generate a beat
function generateBeat() {
  let beat = []
  for (let i = 0; i < phraseNotesCount; i++) {
    let randomNotes = randomNote(keyRange)
    let notes = randomNotes['notes']
    let midiNotes = randomNotes['midiNotes']
    beat.push(notes)
  }
  return beat
}

function shouldSkipBeat() {
  return Math.random() < skipNotesChance;
}

// randomly generate a duration for midi writer
const randomDuration = () => {
  const duration = noteLengths[Math.floor(Math.random() * noteLengths.length)]
  return duration
}

// function that generates a stream of midi notes
async function streamMidi() {
  while (true) {
    for (
      let measure = 0; measure < notesPerMeasure; measure++
    ) {
      for (let noteIndex = 0; noteIndex < notesPerMeasure; noteIndex++) {
        const randomChord = getRandomChord();
        const randomChordLength = randomChord["chordNotesLength"];
        const randomNotes = randomNote(keyRange);
        let midiNotes = playChords === true ? randomChord["chordMidiNotes"] : randomNotes["midiNotes"];
        const notes = playChords === true ? randomChord["randomChordNotes"] : randomNotes["notes"];
        const chordName = playChords === true ? randomChord["randomChord"] : null;

        if (arp) {
          midiNotes = generateArpeggio(midiNotes, arp);
        }

        // Add: Randomize note velocities
        const randomVelocity = Math.floor(Math.random() * (velocity - 50)) + 50;
        // Add: Adjust note duration based on predefined rhythmic patterns
        const randomPatternIndex = Math.floor(Math.random() * noteLengths.length);
        const noteDuration = getNoteDurationInMs(noteLengths[randomPatternIndex]);

        if (!shouldSkipBeat()) {
          if (arp || playChords === false) {
            for (const midiNote of midiNotes) {
              await sendMidi([midiNote], [notes], randomVelocity, channel, noteDuration, chordName, noteIndex);
            }
          } else {
            await sendMidi(midiNotes, notes, randomVelocity, channel, noteDuration, chordName, noteIndex);
          }
        } else {
          await sleep(noteDuration * midiNotes.length); // Rest for the duration of the skipped beat
        }
      }
    }
  }
}

function kill() {
  for (let i = 0; i < 127; i++) {
    output.send("noteoff", {
      note: i + 1,
      velocity: 0,
      channel: channel,
    });
  }
  output.send('stop');
  process.exit(0)
}

// handle process signals
process.on('SIGINT', () => {
  kill()
}); // CTRL+C
process.on('SIGQUIT', () => {
  kill()
}); // Keyboard quit
process.on('SIGTERM', () => {
  kill()
});

// check if the user wants to generate a midi stream
if (generateMidiStream == "true") {
  // function to continuously call sendMidi to generate a stream of midi notes
  streamMidi()
} else {
  // loop through the phrase count and add notes to the track
  for (let i = 0; i < phraseCount; i++) {
    generateBeat().forEach((note) => {
      let duration = randomDuration()
      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: note,
          duration: duration,
          velocity: velocity,
        })
      );
    })
  }
}
// add notes to the track

// check if the last character is /, if not, add it
if (outputPath.charAt(outputPath.length - 1) !== '/') {
  outputPath = outputPath + '/'
}

// if not streaming midi, write a midi file
if (generateMidiStream == "false") {
  const p = `${outputPath}${fileName}`

  // build the midi file
  let write = new MidiWriter.Writer(track).buildFile()
  fs.writeFileSync(p, write, 'binary')

  if (fs.existsSync(p)) {
    console.log(`${p} was created`)
  } else {
    console.log(`${p} was not created`)
  }
}