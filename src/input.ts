export interface InputState {
  left: boolean;
  right: boolean;
  confirm: boolean;
  restart: boolean;
  back: boolean;
}

export function createInputState(): InputState {
  return {
    left: false,
    right: false,
    confirm: false,
    restart: false,
    back: false,
  };
}

export function attachInputListeners(input: InputState): () => void {
  const keyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        input.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        input.right = true;
        break;
      case 'Enter':
      case 'Space':
        input.confirm = true;
        break;
      case 'KeyR':
        input.restart = true;
        break;
      case 'Escape':
      case 'Backspace':
        input.back = true;
        break;
    }
  };

  const keyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        input.right = false;
        break;
      case 'Enter':
      case 'Space':
        input.confirm = false;
        break;
      case 'KeyR':
        input.restart = false;
        break;
      case 'Escape':
      case 'Backspace':
        input.back = false;
        break;
    }
  };

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  return () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  };
}

