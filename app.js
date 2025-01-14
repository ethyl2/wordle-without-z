
// wordlist and dictionary are included in the HTML
const guessGrid = document.querySelector('[data-guess-grid]');
const keyboard = document.querySelector('[data-keyboard]');
const alertContainer = document.querySelector('[data-alert-container]');
const modalContainer = document.querySelector('#modal-container');
const modalContent = document.querySelector('#modal-content');

const WORD_LENGTH = 5;
const DANCE_ANIMATION_DURATION = 1000;
const FLIP_ANIMATION_DURATION = 350;

const startingDate = new Date(2022, 0, 1);
const timeSinceDate = Date.now() - startingDate;
const wordIndex = Math.floor(timeSinceDate / 1000 / 3600 / 24) % wordlist.length;
const targetWord = wordlist[wordIndex];
console.log(`WWZ #${wordIndex} = %c${wordlist[wordIndex]}`, 'color: red; background: red; font-weight: bold;');
let gameOver = false;

// ----- Handle clicks for all objects -----

function handleClick(e) {
  if (e.target.matches('[data-close-modal]')) {
    closeModal();
    return;
  }
  if (e.target.matches('[data-topic]')) {
    openModal(e.target.dataset.topic);
    return;
  }
  if (e.target.matches('[data-copy-link]')) {
    copyTextToClipboard(e.target.dataset.copyLink);
  }

  // Ignore all other clicks after game ends
  if (gameOver) return;

  if (e.target.matches('[data-key]')) {
    const key = e.target.dataset.key;
    if(key === 'Z') {
      console.error('Z clicked');
      openModal('about');
      return;
    }
    pressKey(key);
    return;
  }
  if (e.target.matches('[data-enter]')) {
    submitGuess();
    return;
  }
  if (e.target.matches('[data-backspace]')) {
    deleteLastLetter();
    return;
  }
}

// ----- Handle all keyboard inputs -----

function pressKey(key) {
  // Adds the letter to the guess and update the display
  const activeTiles = getActiveTiles();
  if (activeTiles.length >= WORD_LENGTH) return;

  const nextTile = guessGrid.querySelector(':not([data-letter])');
  nextTile.dataset.letter = key.toLowerCase();
  nextTile.textContent = key.toUpperCase();
  nextTile.dataset.state = 'active';
}

function handleKeyPress(e) {
  const key = e.key;
  if (key === 'Enter') {
    submitGuess();
    return;
  }
  if (key === 'Backspace' || key === 'Delete') {
    deleteLastLetter();
    return;
  }
  if (key.match(/^[a-yA-Y]$/)) {
    pressKey(key);
  }
}

function submitGuess() {
  // If a full row has been entered, check if it's correct
  let submittedWord = '';
  const activeTiles = [...getActiveTiles()];
  if (activeTiles.length < WORD_LENGTH) {
    showAlert('Not enough letters');
    shakeTiles(activeTiles);
    return;
  }
  for (let tile of activeTiles) {
    submittedWord += tile.dataset.letter;
  }
  if (!dictionary.includes(submittedWord)) {
    showAlert(`Not in wordlist`);
    shakeTiles(activeTiles);
    return;
  }

  stopInteraction();
  const letterCount = {};
  resetLetterCount(letterCount, targetWord);
  const tileColors = getTileColors(letterCount, submittedWord, targetWord);
  activeTiles.forEach((...params) => flipTile(...params, submittedWord, tileColors));
}

function deleteLastLetter() {
  // Delete the last letter from the guess (current row only)
  const activeTiles = getActiveTiles();
  if (activeTiles.length === 0) return;

  const lastTile = activeTiles[activeTiles.length - 1];
  lastTile.removeAttribute('data-letter');
  lastTile.textContent = '';
  delete lastTile.dataset.state;
  delete lastTile.dataset.letter;
}

// ----- Helper functions -----

function getActiveTiles() {
  // Returns an array of all unsubmitted tiles on a line.
  return guessGrid.querySelectorAll('[data-state="active"]');
}

function resetLetterCount(letterCount, word) {
  for (let key in letterCount) { delete letterCount[key]; }
  for (let letter of word) {
    if (letter in letterCount) {
      letterCount[letter]++;
    } else {
      letterCount[letter] = 1;
    }
  } 
}

function getTileColors (letterCount, submittedWord, targetWord) {
  let result = [];
  // First pass: find matching and incorrect letters
  for (let i = 0; i < submittedWord.length; i++) {
    const letter = submittedWord[i];
    if (letter === targetWord[i]) {
      result.push('match');
      letterCount[letter]--;
    } else if (!(letter in letterCount)) {
      result.push ('incorrect');
    } else {
      result.push('recheck');
    }
  }
  // Second pass: determine if remaining letters are in the wrong position
  for (let i = 0; i < result.length; i++)
  {
    if(result[i] === 'recheck') {
      const letter = submittedWord[i];
      result[i] = (letterCount[letter] > 0) ? 'wrong-position' : 'incorrect';
    }
  }
  return result;
}

function showAlert(message, duration = 1000) {
  const alert = document.createElement('div');
  alert.textContent = message;
  alert.classList.add('alert');
  alertContainer.prepend(alert);
  setTimeout(() => {
    alert.classList.add('hide');
    // Wait for animation to finish
    alert.addEventListener('transitionend', () => {
      alert.remove();
    });
  }, duration);
}

function shakeTiles(tiles) {
  for (let tile of tiles) {
    tile.classList.add('shake');
    tile.addEventListener('animationend', () => {
      tile.classList.remove('shake');
    }, { once: true });
  }
}

// ----- Game Logic -----
function flipTile(tile, index, array, submittedWord, tileColors) {
  const letter = tile.dataset.letter;
  const key = keyboard.querySelector(`[data-key=${letter.toUpperCase()}]`);
  setTimeout(() => {
    tile.classList.add('flip');
  }, index * 500);

  tile.addEventListener('transitionend', () => {
    tile.classList.remove('flip');
    let status = tileColors[index];
    key.classList.add(status);
    tile.classList.add(status);
    tile.dataset.state = status;

    if (index === array.length - 1) {
      tile.addEventListener('transitionend', () => {
        startInteraction();
        checkWinLose(submittedWord, array);
      }, { once: true });
    }
  }, { once: true });
}

function checkWinLose(submittedWord, tiles) {
  if (submittedWord === targetWord) {
    showAlert('You Win!', 5000);
    danceTiles(tiles);
    showAlert('Copying results to clipboard...', 2000);
    endGame();
    return;
  }
  const remainingTiles = guessGrid.querySelectorAll(':not([data-letter])');
  if (remainingTiles.length === 0) {
    showAlert(`${targetWord.toUpperCase()}`, null);
    shakeTiles(tiles);
    endGame();
  }
}

function danceTiles(tiles) {
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    setTimeout(() => {
      tile.classList.add('dance');
      tile.addEventListener('animationend', () => {
        tile.classList.remove('dance');
      }, { once: true });
    }, (i * DANCE_ANIMATION_DURATION) / 5);
  }
}

// ----- Modal functions -----
function openModal (topic) {
  modalContent.innerHTML = `<div id="modal-snippet"><h3>Loading...</h3></div>`;
  includeHTMLSnippet(document.getElementById('modal-snippet'), `${topic}.html`);
  modalContainer.classList.add('show');
}

function closeModal() {
  modalContainer.classList.remove('show');
}

function includeHTMLSnippet(targetElement, filename) {
  let xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      targetElement.innerHTML =
      this.responseText;
    }
  }
  xhttp.open("GET", filename, true);
  console.log(xhttp);
  // FIXME: "The fetch event for http://.../links.html resulted in a network error response.
  // an object that was not a Response was passed to respondWith()." (next line)
  xhttp.send();
}

// Fallback function for browsers that don't support async clipboard API
// Only call if copyTextToClipboard() fails
function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
    showAlert('Copied to clipboard', 1000);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }
  document.body.removeChild(textArea);
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
    showAlert('Copied');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}

// ----- Interaction functions -----

function startInteraction() {
  document.addEventListener('keydown', handleKeyPress);
  document.addEventListener('click', handleClick);
}

function stopInteraction() {
  document.removeEventListener('keydown', handleKeyPress);
  document.removeEventListener('click', handleClick);
}

function endGame() {
  gameOver = true;
  document.removeEventListener('keydown', handleKeyPress);
}

// ----- Start the game -----
startInteraction();
