const {
  Scale,
  Midi,
  Chord
} = require("tonal");

// import dependencies
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


// Create a new midi track
const track = new MidiWriter.Track()
// Set the tempo
track.setTempo(bpm);


// Parse command line arguments
function parseCommandLineArguments() {
  let argv = yargs(hideBin(process.argv)).argv;

  // function to parse note durations
  function getNoteLengthsConfig() {

    const switchToTripletChance = argv.triplet_chance || 0.0; // 0% chance to switch to triplet note durations
    // function to randomize note durations by randomly switching to triplet note durations
    function randomTripletNoteDuration(duration) {
      if (Math.random() < switchToTripletChance) {
        return duration + "t";
      }
      return duration;
    }

    // parse note durations
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

// function to print configuration
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

const percentage = (skipNotesChance * 100).toFixed(2)
console.log(`skip beats chance: ${percentage}%`)


// function that selects a random chord from the chords const
function getRandomChord() {
  // select a random octave from the range to play the chord in
  let randomOctave = Math.floor(Math.random() * (maxOctave - minOctave + 1)) + minOctave;
  // select a random chord from the chords const
  let randomChord = chords[Math.floor(Math.random() * chords.length)];
  // get the notes of the chord
  let chordNotes = Chord.getChord(randomChord, key)['notes']
  // get the length of the chord notes array
  let chordNotesLength = chordNotes.length
  // array to hold the midi notes of the chord
  let chordMidiNotes = []
  // pick a random set of notes from chordNotes with a min of 1 and max of noteSpread
  let noteCount = randomizeNoteSpread ? Math.floor(Math.random() * (noteSpread - 1 + 1)) + 1 : noteSpread
  // array to hold the random notes from chordNotes
  let randomChordNotes = []
  // pick random notes from chordNotes
  for (let i = 0; i < noteCount; i++) {
    let randomNote = chordNotes[Math.floor(Math.random() * chordNotes.length)];
    randomChordNotes.push(randomNote)
  }
  // convert the random notes to midi notes
  for (note of randomChordNotes) {
    let midiNote = Midi.toMidi(`${note}${randomOctave}`)
    chordMidiNotes.push(midiNote)
  }
  // return the random notes, midi notes, chord, octave, and length of chord notes
  return {
    randomChordNotes,
    chordMidiNotes,
    randomChord,
    randomOctave,
    chordNotesLength
  }
}

// get the midi outputs of the system running the script
var outputs = easymidi.getOutputs();

// if no outputs are found, create one
if (outputs.length === 0) {
  console.log('No outputs found!, initializing one');
  output = new easymidi.Output('Midi Generator', true);

  // if more than one is found, prompt the user to select one
} else if (outputs.length > 1) {
  console.log('Multiple outputs found!, please select one');
  for (let i = 0; i < outputs.length; i++) {
    let number = i + 1;
    console.log(`${number} - ${outputs[i]}`);
  }
  // prompt the user to select an output
  const selectedOutput = prompt('Select an output: ');
  // subtract 1 from the selected output to get the index of the output
  select = Number(selectedOutput) - 1;
  // create a new output using the selected output
  var output = new easymidi.Output(outputs[select]);

  // if only one is found, use that one
} else {
  var output = new easymidi.Output(outputs[0]);
}
// send a clock signal to the output
output.send('clock');
// send a start signal to the output
output.send('start');

// function that gets the duration of a note in ms
function getNoteDurationInMs(noteDuration) {
  const beatDurationInMs = (60 * 1000) / bpm;
  const notesPerBeat = getNotesPerBeat(noteDuration);
  return beatDurationInMs / notesPerBeat;
}


// function that sends midi notes
async function sendMidi(midiNotes, notes, velocity, channel, noteDuration, chordName) {

  // if playChords is false, only log the notes
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
  // select a random note from the items array
  let note = items[items.length * Math.random() | 0];
  // convert the note to a midi note
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

  // push random notes to the notes array until the noteSpread value is reached
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


// generate a beat, used when generating a midi file
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

// function that determines if a note should be skipped
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
      // loop through the number of measures
      let measure = 0; measure < notesPerMeasure; measure++
    ) {
      // loop through the number of notes per measure
      for (let noteIndex = 0; noteIndex < notesPerMeasure; noteIndex++) {
        // get a random chord
        const randomChord = getRandomChord();
        // get the length of the chord
        const randomChordLength = randomChord["chordNotesLength"];
        // get the notes in the chord
        const randomNotes = randomNote(keyRange);
        // get the midi notes
        let midiNotes = playChords === true ? randomChord["chordMidiNotes"] : randomNotes["midiNotes"];
        // get the notes
        const notes = playChords === true ? randomChord["randomChordNotes"] : randomNotes["notes"];
        // get the chord name
        const chordName = playChords === true ? randomChord["randomChord"] : null;

        // if arp is true, generate an arpeggio
        if (arp) {
          midiNotes = generateArpeggio(midiNotes, arp);
        }

        // randomly generate a velocity
        const randomVelocity = Math.floor(Math.random() * (velocity - 50)) + 50;
        // randomly adjust note duration based on predefined rhythmic patterns
        const randomPatternIndex = Math.floor(Math.random() * noteLengths.length);
        // get the duration of the note
        const noteDuration = getNoteDurationInMs(noteLengths[randomPatternIndex]);

        // if the note should not be skipped, send the midi notes
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

// function that kills the process and sends noteoff signals
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