from fuzzywuzzy import fuzz


def segment_data(text,features):

    segmented_results = {}
    text_lower = text.lower()

    for feature_obj in features :
        feature_name = feature_obj.name

        found_value = "Not Mentioned"

        #for splitting sentences, we can use a more robust method like nltk's sent_tokenize, but for simplicity, we'll split on periods here.
        sentences = text_lower.split('.')
        

        for sentence in sentences:
            if feature_name.lower() in sentence or fuzz.partial_ratio(feature_name.lower(), sentence) > 85:
                found_value = sentence.strip()
                break

        segmented_results[feature_name] = found_value
    return segmented_results