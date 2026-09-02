const Alexa = require('ask-sdk-core');

// Skill state management variables
let questionsList, currentIndex, count, hits, pending, currentStatus, exit;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    initData();
    const questionText = getQuestion();
    currentStatus = 'Question';
    const speakOutput =
        '¡Hola! Vamos a jugar a un juego: ¿En qué año pasó? Tendrás que responder diciendo qué año corresponde con el hito al que hago referencia. ¡Vamos a empezar! ' +
        questionText;

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const AnswerIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerIntent';
  },
  handle(handlerInput) {
    const AnswerValue = handlerInput.requestEnvelope.request.intent.slots.numberSlot.value;
    let speakOutput = '';

    if (currentStatus === 'Continue') {
      speakOutput += 'Responde sí o no';
    } else {
      // Check if user answer matches target year
      if (AnswerValue === currentIndex.year) {
        speakOutput += 'Respuesta correcta! ' + currentIndex.answer + '.';
        hits++;
      } else {
        speakOutput += 'Respuesta incorrecta, la respuesta correcta es ' +
            currentIndex.year + '. ' + currentIndex.answer + '.';
      }
    }
    currentIndex = null;
    speakOutput += ' ¿Continuamos? ';
    currentStatus = 'Continue';

    if (exit) {
      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } else {
      return handlerInput.responseBuilder.speak(speakOutput)
          .reprompt(speakOutput)
          .getResponse();
    }
  }
};

const RepeatIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepeatIntent';
  },
  handle(handlerInput) {
    let speakOutput = '';
    if (currentStatus === 'Question') {
      speakOutput += 'Repitamos la pregunta: ' + getQuestion(false);
    } else if (currentStatus === 'Continue') {
      speakOutput += '¿Quieres continuar? ';
    }

    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const YesIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const speakOutput = getQuestion();
    currentStatus = 'Question';
    if (exit) {
      return handlerInput.responseBuilder.speak(speakOutput)
          .withShouldEndSession(true)
          .getResponse();
    } else {
      return handlerInput.responseBuilder.speak(speakOutput)
          .reprompt(speakOutput)
          .getResponse();
    }
  }
};

const PendingIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'PendingIntent';
  },
  handle(handlerInput) {
    let speakOutput = '';
    if (pending === null) {
      if (currentIndex !== null && currentStatus === 'Question') {
        speakOutput += 'Hemos dejado esta pregunta sin responder, la guardamos para después. ';
        pending = currentIndex;
      }
      speakOutput += 'No tienes preguntas pendientes, ¿quieres continuar con una nueva pregunta?';
      currentStatus = 'Continue';
    } else {
      if (currentIndex !== null && currentStatus === 'Question') {
        let tmpIndex = currentIndex;
        currentIndex = pending;
        pending = tmpIndex;
        speakOutput += 'Hemos dejado esta pregunta sin responder, así que la guardaremos para después. Continuemos: ';
      } else {
        currentIndex = pending;
        pending = null;
      }
      speakOutput += 'Vamos con la pregunta que teníamos pendiente: ' + getQuestion(false);
      currentStatus = 'Question';
    }
    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const NextIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextIntent';
  },
  handle(handlerInput) {
    let speakOutput = '';
    if (pending !== null) {
      speakOutput = 'Has alcanzado el máximo de preguntas pendientes de responder, vamos con esta otra vez: ';
      const tmpIndex = currentIndex;
      currentIndex = pending;
      pending = tmpIndex;
      speakOutput += getQuestion(false);
    } else {
      speakOutput = 'Guardamos esta pregunta para después, vamos con la siguiente: ';
      pending = currentIndex;
      speakOutput += getQuestion();
    }
    currentStatus = 'Question';
    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const ClueIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'ClueIntent';
  },
  handle(handlerInput) {
    let speakOutput = '';
    if (currentStatus === 'Question') {
      speakOutput += 'Ahí va una pista: ' + currentIndex.clue +
          '. Te vuelvo a repetir la pregunta: ' + getQuestion(false);
    } else if (currentStatus === 'Continue') {
      speakOutput += 'Responde Sí o No.';
    }

    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput =
        'El juego consiste en que te iré haciendo preguntas y tendrás que acertar el año ' +
        'correcto, pero si no sabes la respuesta puedes decirme que pase a la ' +
        'siguiente y así tendrás tiempo de pensar la respuesta. Puedes tener hasta una pregunta pendiente de responder.';

    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
         Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
         Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Has conseguido acertar ' + hits + ' de ' + count +
        ' preguntas. ¡Buen trabajo, hasta luego!';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'Lo siento, no entiendo lo que me dices. Por favor inténtalo otra vez.';

    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  }
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const speakOutput = 'Lo siento, tuve problemas para hacer lo que me pediste. Inténtalo de nuevo.';
    console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

    return handlerInput.responseBuilder.speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
  }
};

/**
 * Initializes state variables and imports the question dataset.
 */
function initData() {
  // Imports external question database
  questionsList = require('./question-list');
  currentIndex = null;
  count = 0;
  hits = 0;
  pending = null;
  currentStatus = null;
  exit = false;
}

/**
 * Retrieves a random item from an object.
 */
function getRandomItem(obj) {
  if (Object.keys(obj).length === 0) {
    return null;
  }
  currentIndex = obj[Object.keys(obj)[Math.floor(Math.random() * Object.keys(obj).length)]];
  return currentIndex;
}

/**
 * Handles question fetching logic, question pool removal, and game over triggers.
 */
function getQuestion(random = true) {
  let speechText = '';
  if (random) {
    speechText = getRandomItem(questionsList);
    if (currentIndex === null && pending === null) {
      const speakOutput =
          'Ya respondiste todas las preguntas! ... Has conseguido acertar ' +
          hits + ' de ' + count + ' preguntas. ... Hasta luego!';
      exit = true;
      return speakOutput;
    } else if (currentIndex === null) {
      return 'Ya no te quedan más preguntas nuevas, pero sí te queda una pendiente, vamos con ella. ... ' +
          '¿En qué año ' + speechText.question + '? ';
    }
    delete questionsList[currentIndex.id];
    count++;
  } else {
    speechText = currentIndex;
  }
  const speakOutput = '¿En qué año ' + speechText.question + '? ';
  return speakOutput;
}

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler, AnswerIntentHandler, RepeatIntentHandler,
        NextIntentHandler, ClueIntentHandler, HelpIntentHandler,
        YesIntentHandler, PendingIntentHandler, CancelAndStopIntentHandler,
        FallbackIntentHandler, SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();