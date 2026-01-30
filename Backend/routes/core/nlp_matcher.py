from fuzzywuzzy import fuzz


def segment_data(text,features):

    segmented_results = {}
    text_lower = text.lower()

    for feature in features :
        found_value = "Not Mentioned"

        sentences = text_lower.split('.')
        

        for sentence in sentences:
            if feature.lower() in sentence or fuzz.partial_ratio(feature.lower(), sentence) > 80:
                found_value = sentence.strip()

        segmented_results[feature] = found_value
    return segmented_results