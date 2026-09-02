// This sample demonstrates handling intents from an Alexa skill using the Alexa
// Skills Kit SDK (v2). Please visit https://alexa.design/cookbook for
// additional examples on implementing slots, dialog management, session
// persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
var persistenceAdapter = getPersistenceAdapter();

const moment =
    require('moment-timezone');  // will help us do all the birthday math

// i18n dependencies. i18n is the main module, sprintf allows us to include
// variables with '%s'.
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');

// We import language strings object containing all of our strings.
// The keys for each string will then be referenced in our code
// e.g. requestAttributes.t('WELCOME_MSG')
const languageStrings = require('./localisation');

/**
 * @brief Returns either an S3PersistenceAdapter or a DynamoDbPersistenceAdapter
 *        based on if this is an Alexa-Hosted skill or not.
 *
 * @returns {S3PersistenceAdapter|DynamoDbPersistenceAdapter}
 */
function getPersistenceAdapter() {
  // This function is an indirect way to detect if this is part of an
  // Alexa-Hosted skill
  function isAlexaHosted() {
    return process.env.S3_PERSISTENCE_BUCKET ? true : false;
  }
  const tableName = 'exam_date_table';
  if (isAlexaHosted()) {
    const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
    return new S3PersistenceAdapter(
        {bucketName: process.env.S3_PERSISTENCE_BUCKET});
  } else {
    // IMPORTANT: don't forget to give DynamoDB access to the role you're to run
    // this lambda (IAM)
    const {DynamoDbPersistenceAdapter} =
        require('ask-sdk-dynamodb-persistence-adapter');
    return new DynamoDbPersistenceAdapter(
        {tableName: tableName, createTable: true});
  }
}

const LaunchRequestHandler = {
  /**
   * @brief Checks if the handler is responsible for the given request.
   *
   * @param {HandlerInput} handlerInput The handler input.
   * @return {boolean} True if the handler is responsible.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  /**
   * @brief Handles the launch request.
   *
   * @details It checks if the day, month, year, hour and subject are defined in
   *          the session attributes. If they are, it constructs a speech output
   *          with the register message; otherwise, with the welcome message.
   *
   * @param {HandlerInput} handlerInput - The handler input.
   * @return {Response} The response to be sent to the user.
   */
  handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    // const requestAttributes =
    // handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();

    const day = sessionAttributes['day'];
    const month = sessionAttributes['month'];
    const year = sessionAttributes['year'];
    const hour = sessionAttributes['hour'];
    const subject = sessionAttributes['subject'];

    let speechText = requestAttributes.t('WELCOME_MSG');
    // const speechText = requestAttributes.t('WELCOME_MSG');

    if (day && month && year && hour && subject) {
      speechText =
          requestAttributes.t('REGISTER_MSG', day, month, year, hour, subject)
    }

    return handlerInput.responseBuilder.speak(speechText)
        .reprompt(speechText)
        .getResponse();
  }
};

const RegisterExamIntentHandler = {
  /**
   * @brief Checks if the handler is responsible for the given request.
   *
   * @param {HandlerInput} handlerInput The handler input.
   * @return {boolean} True if the handler is responsible.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name ===
        'RegisterExamIntent';
  },
  /**
   * @brief Handles the RegisterExamIntent request.
   *
   * @details It extracts the day, month, year, hour and subject from the intent
   *          slots and stores them in the session attributes. It then
   *          constructs a speech output with the register message and the help
   *          message.
   *
   * @param {HandlerInput} handlerInput - The handler input.
   * @return {Response} The response to be sent to the user.
   */
  handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();
    const {intent} = handlerInput.requestEnvelope.request;

    const day = intent.slots.day.value;
    const month = intent.slots.month.resolutions.resolutionsPerAuthority[0]
                      .values[0]
                      .value.id;
    const monthName = intent.slots.month.resolutions.resolutionsPerAuthority[0]
                          .values[0]
                          .value.name;
    const year = intent.slots.year.value;
    const hour = intent.slots.hour.value;
    const subject = intent.slots.subject.resolutions.resolutionsPerAuthority[0]
                        .values[0]
                        .value.name;

    sessionAttributes['day'] = day;
    sessionAttributes['month'] = month;
    sessionAttributes['monthName'] = monthName;
    sessionAttributes['year'] = year;
    sessionAttributes['hour'] = hour;
    sessionAttributes['subject'] = subject;

    return handlerInput.responseBuilder
        .speak(
            requestAttributes.t(
                'REGISTER_MSG', day, monthName, year, hour, subject) +
            requestAttributes.t('HELP_MSG'))
        .reprompt(requestAttributes.t('HELP_MSG'))
        .getResponse();
  }
};

const SayExamIntentHandler = {
  /**
   * @brief Determines if the handler can handle the request.
   *
   * @param {HandlerInput} handlerInput - The input to the handler, containing
   *                                    the request envelope.
   * @return {boolean} True if the request is an IntentRequest and the intent is
   *                   'SayExamIntent'; otherwise, false.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === 'SayExamIntent';
  },
  /**
   * @brief Handles the SayExamIntent. It looks for the attributes 'day',
   *        'month', 'year', 'hour', and 'subject' in the session attributes. If
   *        all of them are there, it calculates the number of days left until
   *        the next exam and the age of the person. It then sends a message to
   *        the user telling them how many days are left and how old they will
   *        be when the exam happens. If any of the attributes are missing, it
   *        sends a message asking the user to provide them.
   *
   * @param {HandlerInput} handlerInput - The input to the handler, containing
   *                                    the request envelope.
   * @return {Object} The response to be sent to the user, containing speech
   *                  output and a reprompt.
   */
  async handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const sessionAttributes = attributesManager.getSessionAttributes();

    const day = sessionAttributes['day'];
    const month = sessionAttributes['month'];
    const year = sessionAttributes['year'];
    const hour = sessionAttributes['hour'];
    const subject = sessionAttributes['subject'];

    let speechText;
    if (day && month && year && hour && subject) {
      const timezone = 'Europe/Madrid';  // we'll change this later to retrieve
                                         // the timezone from the device
      const today = moment().tz(timezone).startOf('day');
      const wasBorn = moment(`${month}/${day}/${year}`, 'MM/DD/YYYY')
                          .tz(timezone)
                          .startOf('day');
      const nextExam = moment(`${month}/${day}/${today.year()}`, 'MM/DD/YYYY')
                           .tz(timezone)
                           .startOf('day');
      if (today.isAfter(nextExam)) {
        nextExam.add('years', 1);
      }
      const age = today.diff(wasBorn, 'years');
      const daysLeft =
          nextExam.startOf('day').diff(today, 'days');  // same days returns 0
      speechText = requestAttributes.t('SAY_MSG', daysLeft, age + 1);
      if (daysLeft === 0) {
        speechText = requestAttributes.t('GREET_MSG', age);
      }
      speechText += requestAttributes.t('OVERWRITE_MSG');
    } else {
      speechText = requestAttributes.t('MISSING_MSG');
    }

    return handlerInput.responseBuilder.speak(speechText)
        .reprompt(requestAttributes.t('HELP_MSG'))
        .getResponse();
  }
};

const HelpIntentHandler = {
  /**
   * @brief Checks if the handler can handle the given request.
   *
   * @details This function checks if the request is an IntentRequest and if
   * the intent name is 'AMAZON.HelpIntent'.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {boolean} True if the handler can handle the given request, false
   *                   otherwise.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.HelpIntent';
  },
  /**
   * @brief Handles the AMAZON.HelpIntent, sending a help message to the user.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {Response} The response with a help speech and reprompt.
   */
  handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('HELP_MSG');

    return handlerInput.responseBuilder.speak(speechText)
        .reprompt(speechText)
        .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  /**
   * @brief Determines if the handler can handle the Cancel or Stop intents.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {boolean} True if the handler can handle CancelIntent or
   *     StopIntent,
   *                   false otherwise.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        (handlerInput.requestEnvelope.request.intent.name ===
             'AMAZON.CancelIntent' ||
         handlerInput.requestEnvelope.request.intent.name ===
             'AMAZON.StopIntent');
  },
  /**
   * @brief Handles the StopIntent and CancelIntent by providing a goodbye
   * message.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope and context.
   * @return {Response} The response to be sent to the user, including speech
   *                   output.
   */
  handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('GOODBYE_MSG');

    return handlerInput.responseBuilder.speak(speechText).getResponse();
  }
};

const FallbackIntentHandler = {
  /**
   * @brief Checks if the given {@link HandlerInput} can be handled by this
   * {@link FallbackIntentHandler}.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {boolean} True if the handler can handle the given request, false
   *                   otherwise.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name ===
        'AMAZON.FallbackIntent';
  },
  /**
   * @brief Handles the FallbackIntentRequest by providing a fallback message.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope and context.
   * @return {Response} The response to be sent to the user, including
   *                    speech output and reprompt.
   */
  handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('FALLBACK_MSG');

    return handlerInput.responseBuilder.speak(speechText)
        .reprompt(speechText)
        .getResponse();
  }
};

const SessionEndedRequestHandler = {
  /**
   * @brief Checks if the given {@link HandlerInput} can be handled by this
   * {@link SessionEndedRequestHandler}.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {boolean} True if the handler can handle the given request, false
   *                   otherwise.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  /**
   * @brief Handles the SessionEndedRequest event.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {Object} The response to be sent to the user.
   */
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom
// handlers for your intents by defining them above, then also adding them to
// the request handler chain below.
const IntentReflectorHandler = {
  /**
   * @brief Checks if the given {@link HandlerInput} can be handled by this
   * {@link IntentReflectorHandler}.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {boolean} True if the handler can handle the given request, false
   *                   otherwise.
   */
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest';
  },
  /**
   * @brief Handles the given {@link HandlerInput} by repeating the intent
   *        that the user said.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @return {Object} The response to be sent to the user.
   */
  handle(handlerInput) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const intentName = handlerInput.requestEnvelope.request.intent.name;
    const speechText = requestAttributes.t('REFLECTOR_MSG', intentName);

    return handlerInput.responseBuilder
        .speak(speechText)
        //.reprompt('add a reprompt if you want to keep the session open for the
        // user to respond')
        .getResponse();
  }
};

// Generic error handling to capture any syntax or routing errors. If you
// receive an error stating the request handler chain is not found, you have not
// implemented a handler for the intent being invoked or included it in the
// skill builder below.
const ErrorHandler = {
  /**
   * @brief Determines if the error handler can handle the current request.
   *
   * @return {boolean} Always returns true, indicating that this error handler
   *                   can handle any request.
   */
  canHandle() {
    return true;
  },
  /**
   * @brief Handles any errors that are not caught by other error handlers.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope and context.
   * @param {Error} error The error that was not caught by any other error
   *                      handlers.
   * @return {Object} The response to be sent to the user, containing an error
   *                  message.
   */
  handle(handlerInput, error) {
    const {attributesManager} = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();
    const speechText = requestAttributes.t('ERROR_MSG');

    console.log(`~~~~ Error handled: ${error.message}`);

    return handlerInput.responseBuilder.speak(speechText)
        .reprompt(speechText)
        .getResponse();
  }
};

// This request interceptor will log all incoming requests to this lambda
const LoggingRequestInterceptor = {
  /**
   * @brief Logs the incoming request to the console.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope and context.
   */
  process(handlerInput) {
    console.log(`Incoming request: ${
        JSON.stringify(handlerInput.requestEnvelope.request)}`);
  }
};

// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
  /**
   * @brief Processes the outgoing response and logs it to the console.
   *
   * @param {HandlerInput} handlerInput The input to the handler, containing
   *                                    the request envelope.
   * @param {Object} response The response to be sent to the user.
   */
  process(handlerInput, response) {
    console.log(`Outgoing response: ${JSON.stringify(response)}`);
  }
};

// This request interceptor will bind a translation function 't' to the
// requestAttributes.
const LocalizationRequestInterceptor = {
  /**
   * @brief Initializes the localization client with the appropriate locale and
   *        language resources, and binds a translation function to the
   *        request attributes for translating arguments.
   *
   * @param {Object} handlerInput - The input object containing the request
   *                                envelope and attributes manager.
   */
  process(handlerInput) {
    // const {request} = handlerInput.requestEnvelope;
    // const locale = request.locale || 'en-US';
    const locale = handlerInput.requestEnvelope.request.locale || 'en-US';
    console.log('Locale detected: ${locale}');
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler:
          sprintf.overloadTranslationOptionHandler,
      resources: languageStrings,
      // fallbackLng: 'en',
      returnObjects: true
    });
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    /**
     * @brief A translation function that uses the localization client to
     *        translate the provided arguments based on the current locale and
     *        available language resources.
     *
     * @param {...any} args - The arguments to be translated.
     * @returns {string} The translated string.
     */
    // attributes.t = function(...args) {
    //   return localizationClient.t(...args);
    // }
    attributes.t = function(...args) {
      return localizationClient.t(...args);
    };
  }
};

const LoadAttributesRequestInterceptor = {
  /**
   * @brief Checks if the session is new and loads the persistent session
   *        attributes to the session attributes. This allows use of
   * persistent session attributes just like session attributes.
   *
   * @param {HandlerInput} handlerInput The current request to process.
   * @return {Promise<void>} A promise that resolves when the loading is
   *     finished.
   */
  async process(handlerInput) {
    if (handlerInput.requestEnvelope.session['new']) {  // is this a new
                                                        // session?
      const {attributesManager} = handlerInput;
      const persistentAttributes =
          await attributesManager.getPersistentAttributes() || {};
      // copy persistent attribute to session attributes
      handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
    }
  }
};

const SaveAttributesResponseInterceptor = {
  /**
   * @brief Processes the response to determine if the session should end. If
   *        the session is ending, it saves the session attributes to
   * persistent storage. This ensures that the attributes are retained for
   * future sessions.
   *
   * @param {Object} handlerInput - The input object containing the request
   *     envelope and attributes manager.
   * @param {Object} response - The response object, which may contain a flag
   *     indicating if the session should end.
   */
  async process(handlerInput, response) {
    const {attributesManager} = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const shouldEndSession =
        (typeof response.shouldEndSession === 'undefined' ?
             true :
             response.shouldEndSession);  // is this a session end?
    if (shouldEndSession ||
        handlerInput.requestEnvelope.request.type ===
            'SessionEndedRequest') {  // skill was stopped or timed out
      attributesManager.setPersistentAttributes(sessionAttributes);
      await attributesManager.savePersistentAttributes();
    }
  }
};

exports.handler =
    Alexa.SkillBuilders.custom()
        .addRequestHandlers(
            LaunchRequestHandler, RegisterExamIntentHandler,
            SayExamIntentHandler, HelpIntentHandler, CancelAndStopIntentHandler,
            SessionEndedRequestHandler,
            IntentReflectorHandler)  // make sure IntentReflectorHandler is
                                     // last so it doesn't override your
                                     // custom intent handlers
        .addRequestInterceptors(
            LocalizationRequestInterceptor, LoggingRequestInterceptor,
            LoadAttributesRequestInterceptor)
        .addResponseInterceptors(
            LoggingResponseInterceptor, SaveAttributesResponseInterceptor)
        .withPersistenceAdapter(persistenceAdapter)
        .lambda();