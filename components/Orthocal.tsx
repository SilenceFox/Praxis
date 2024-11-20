import React, { useContext, useState, useEffect, Suspense, useMemo } from 'react';
import { View, Text, StyleSheet, Image, FlatList, Pressable, Dimensions, ImageBackground, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useLanguage } from "@/constants/LanguageContext";
import { useCalendar } from "@/constants/CalContext";
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import translations from "@/translations.json";
import gregorianen from "@/assets/orthocal-fetches/gregorian_en_2024/gregorian_en_2024-01.json";
import gregen from "@/assets/orthocal-fetches/gregorian_en.json";
import gregpt from "@/assets/orthocal-fetches/gregorian_pt.json";
import julen from "@/assets/orthocal-fetches/julian_en.json";
import julpt from "@/assets/orthocal-fetches/julian_pt.json";
import DateTimePicker from "@react-native-community/datetimepicker";
import ReadMore from '@fawazahmed/react-native-read-more';
import { useSharedValue } from "react-native-reanimated";
import Carousel, { ICarouselInstance, Pagination } from "react-native-reanimated-carousel";
import { LinearGradient } from 'expo-linear-gradient';
import DaySlider from "@/components/DaySlider";
import { ImageSlider } from "@/constants/CommonPrayerSliderData";

const i18n = new I18n(translations);
// const gregen = JSON.parse(String(gregorianen));
const {width} = Dimensions.get('screen');

let testerester = [];

//ATTENTION: API REQUEST SHOULD BE DONE AT EVERY BUTTON CLICK

const Orthocal = () => {
    //Language variables
    const { language } = useLanguage();
    let [locale, setLocale] = useState(Localization.locale);
    i18n.defaultLocale = "en";
    i18n.locale = language;

    const { calendar } = useCalendar();


    //DateTimePicker variables
    const [appDate, setAppDate] = useState(new Date());
    const firstDay = new Date(2024, 0, 1);
    const [diffIndex, setDiffIndex] = useState(Math.floor(Math.abs(appDate - firstDay) / (1000 * 60 * 60 * 24)))
    const [mode, setMode] = useState('date');
    const [show, setShow] = useState(false);


    const showMode = (currentMode) => {
        setShow(true);
        setMode(currentMode);
    };

    const showDatepicker = () => {
        showMode('date');
    };

    const today = new Date();
    today.setHours(0);
    const dayOne = new Date(2024, 8, 28);
    dayOne.setHours(0);
    const diffTime = Math.abs(today - dayOne); //Standard diff in time, as fallback
    const dateIndexFallback = Math.floor(diffTime / (1000 * 60 * 60 * 24));


    const praxisApiUrlFallback = `https://praxis-prayers-default-rtdb.europe-west1.firebasedatabase.app/VCALENDAR/0/VEVENT/${dateIndexFallback}.json`
    const [praxisApiUrl, setPraxisApiUrl] = useState(praxisApiUrlFallback);

    const onChange = (event, selectedDate) => {
        const currentDate = selectedDate;
        currentDate.setHours(0);
        setShow(false);
        setAppDate(currentDate);
        setDiffIndex(Math.floor(Math.abs(currentDate - firstDay) / (1000 * 60 * 60 * 24)))
        fetchDate(`https://praxis-prayers-default-rtdb.europe-west1.firebasedatabase.app/VCALENDAR/0/VEVENT/${Math.floor(Math.abs(currentDate - dayOne) / (1000 * 60 * 60 * 24))}.json`); //Should happen simultaneously
    };

    //Create function declaration that takes takes the url and gets all the information
    const [date, setDate] = useState([]);
    const [fastLevel, setFastLevel] = useState([]);
    const [commemorations, setCommemorations] = useState([]);
    const [readings, setReadings] = useState([]);
    const [summary, setSummary] = useState([]);
    const [tester, setTester] = useState([]);
    const [orthocalInfo, setOrthocalInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chosenCalendar, setChosenCalendar] = useState([]);

    //Day message
    const weekDay = appDate.getDay();
    const dayNumber = appDate.getDate();
    const monthNumber = appDate.getMonth();
    const yearNumber = appDate.getUTCFullYear();

    let weekDayName = "";
    switch(weekDay) {
            case 0:
            weekDayName = i18n.t("calendar.weekDays.sunday");
            break;
            case 1:
            weekDayName = i18n.t("calendar.weekDays.monday");
            break;
            case 2:
            weekDayName = i18n.t("calendar.weekDays.tuesday");
            break;
            case 3:
            weekDayName = i18n.t("calendar.weekDays.wednesday");
            break;
            case 4:
            weekDayName = i18n.t("calendar.weekDays.thursday");
            break;
            case 5:
            weekDayName = i18n.t("calendar.weekDays.friday");
            break;
            case 6:
            weekDayName = i18n.t("calendar.weekDays.saturday");
            break;
            default:
            weekDayName = "Error";
    }

    const monthName = i18n.t("calendar.monthNames." + String(monthNumber));

    let dateTitle = "";
    if (language === 'pt') {
        dateTitle = weekDayName + ", " + String(dayNumber) + " de " + monthName + ", " + String(yearNumber);
    } else if (language === 'en') {
        dateTitle = weekDayName + ", " + monthName + " " + String(dayNumber) + ", " + String(yearNumber);
    }

    useEffect(() => {
        fetchDate();
    }, []);

    const fetchDate = async (url = praxisApiUrlFallback) => {
        setLoading(true);
        try {
            const response = await axios.get(url);
            setDate(response.data);

            const fetchedSummary = response.data.SUMMARY;
            const fullDescription = response.data.DESCRIPTION;

            // Separators
            const firstSeparator = fullDescription.search(/\\n\\n/) //Separates fast level from the rest
            const fastDescription = fullDescription.slice(0, firstSeparator).toUpperCase();
            const lastSeparator = fullDescription.length - fullDescription.split("").reverse().join("").search(/n\\n\\/); //Separates link at the end from the rest
            const commemorationsAndReadingsDescription = fullDescription.slice(firstSeparator + 4, lastSeparator - 4);
            const beforeLastSeparator = commemorationsAndReadingsDescription.length - commemorationsAndReadingsDescription.split("").reverse().join("").search(/n\\n\\/);
            const readingsDescriptionUnprocessed = commemorationsAndReadingsDescription.slice(beforeLastSeparator);
            const commemorationsDescriptionUnprocessed = commemorationsAndReadingsDescription.slice(0, beforeLastSeparator - 4);

            setSummary(fetchedSummary);
            setFastLevel(fastDescription);

            let commemorationsDescriptionArray = [];
            commemorationsDescriptionArray.push(commemorationsDescriptionUnprocessed);
            while (commemorationsDescriptionArray[commemorationsDescriptionArray.length - 1].search(/\\n\\n/) !== -1) {
                let separatorIndex = commemorationsDescriptionArray[commemorationsDescriptionArray.length - 1].search(/\\n\\n/);
                let firstCommemorations = commemorationsDescriptionArray[commemorationsDescriptionArray.length - 1].slice(0, separatorIndex);
                let nextCommemorations = commemorationsDescriptionArray[commemorationsDescriptionArray.length - 1].slice(separatorIndex + 4);
                commemorationsDescriptionArray.pop();
                commemorationsDescriptionArray.push(firstCommemorations);
                commemorationsDescriptionArray.push(nextCommemorations);
            }

            setCommemorations(commemorationsDescriptionArray.join(" • "));


            // Processing readings
            let readingsDescriptionArray = [];
            readingsDescriptionArray.push(readingsDescriptionUnprocessed);
            while (readingsDescriptionArray[readingsDescriptionArray.length - 1].search(/\\n/) !== -1) {
               // Create an empty array outside. While not true, remove and push first part into an array of strings. Continue with remnant. Repeat.
                //Replace reading description by while lastelement of array has /\\n/
                let separatorIndex = readingsDescriptionArray[readingsDescriptionArray.length - 1].search(/\\n/);
                let firstReadings = readingsDescriptionArray[readingsDescriptionArray.length - 1].slice(0, separatorIndex);
                let nextReadings = readingsDescriptionArray[readingsDescriptionArray.length - 1].slice(separatorIndex + 2);
                readingsDescriptionArray.pop();
                readingsDescriptionArray.push(firstReadings);
                readingsDescriptionArray.push(nextReadings);

            }
            setReadings(readingsDescriptionArray.join(" • "));

            console.log('Summary:', summary);
            console.log('Fast Level:', fastLevel);
            console.log('Commemorations:', commemorations);
            console.log('Readings:', readings);

            /* setOrthocalInfo([
             *     {
             *         title: String(fetchedSummary),
             *         image: require('@/assets/images/orthodox-date.jpg'),
             *         description: String(fastLevel),
             *         link: '/home/prayers/morning-prayers'
             *     },
             *     {
             *         title: "COMEMORAÇÕES",
             *         image: require('@/assets/images/orthodox-date.jpg'),
             *         description: String(commemorations),
             *         link: '/home/prayers/morning-prayers'
             *     },
             *     {
             *         title: "LEITURAS",
             *         image: require('@/assets/images/orthodox-date.jpg'),
             *         description: String(readings),
             *         link: '/home/prayers/morning-prayers'
             *     }
             * ]); */


        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const itemList = useMemo(() => [
        {
            title: String(summary),
            image: require('@/assets/images/orthodox-date.jpg'),
            description: String(fastLevel) + String(language) + String(calendar),
        },
        {
            title: "COMEMORAÇÕES",
            image: require('@/assets/images/saints.jpg'),
            description: String(commemorations),
        },
        {
            title: "LEITURAS",
            image: require('@/assets/images/bible.jpg'),
            description: String(readings),
        }
    ], [summary, fastLevel, commemorations, readings, language, calendar]);


    const areDataReady = summary && fastLevel && commemorations && readings;

    // For the new API replacement

    const fallbackSynaxList = [
        {
            title: 'Please select a language and calendar',
            image: require('@/assets/images/saints.jpg'),
            description: 'Selecione uma língua e um calendário',
        },
        {
            title: 'Please select a language and calendar',
            image: require('@/assets/images/saints.jpg'),
            description: 'Selecione uma língua e um calendário',
        },
        {
            title: 'Please select a language and calendar',
            image: require('@/assets/images/saints.jpg'),
            description: 'Selecione uma língua e um calendário',
        },
    ];

    const [synaxList, setSynaxList] = useState(fallbackSynaxList);

    // Now, create functions to get titles and descriptions from langCal
    // Generate object
    const generateDescriptions = (langCal, index) => {
        return({
            titles: langCal[index].titles.join(" • "),
            fasting: langCal[index].fast_exception_desc === "" ? langCal[index].fast_level_desc : langCal[index].fast_level_desc + " — " + langCal[index].fast_exception_desc,
            commemorations: langCal[index].feasts === null || langCal[index].saints === null ? (langCal[index].feasts === null ? langCal[index].saints.join(" • ") : langCal[index].feasts.join(" • ")) : langCal[index].feasts.concat(langCal[index]).join(" • "),
            readings: langCal[index].abbreviated_reading_indices.map((i) => langCal[index].readings[i].display).join(" • "),
        });
    };

    useEffect(() => {
        const newLangCal = () => {
            let langCal = {};
            let langCalString = String(calendar) + String(language);
            switch(langCalString) {
                case 'julen':
                    langCal = julen;
                    break;
                case 'julpt':
                    langCal = julpt;
                    break;
                case 'gregen':
                    langCal = gregen;
                    break;
                case 'gregpt':
                    langCal = gregpt;
            }
            return(langCal);
        };
        const generateSynax = () => {
            return([
                {
                    title: generateDescriptions(newLangCal(), diffIndex).titles,
                    image: require('@/assets/images/saints.jpg'),
                    description: generateDescriptions(newLangCal(), diffIndex).fasting,
                },
                {
                    title: i18n.t('cardContent.commemorations'),
                    image: require('@/assets/images/saints.jpg'),
                    description: generateDescriptions(newLangCal(), diffIndex).commemorations,
                },
                {
                    title: i18n.t("cardContent.readings"),
                    image: require('@/assets/images/bible.jpg'),
                    description: generateDescriptions(newLangCal(), diffIndex).readings,
                },
            ]);
        };
        setSynaxList(generateSynax());
    }, [language, calendar, diffIndex]);

    const thisDay = new Date();
    const gregDayIndex = Math.floor(Math.abs(thisDay - firstDay) / (1000 * 60 * 60 * 24));
    /*
    const diffTime = Math.abs(today - dayOne); //Standard diff in time, as fallback
    const dateIndexFallback = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    */
    /*
       Switching completely
    /
    /  The trick will be to reset and rewrite so that onChange of one of the settings picker, things restart
    */

    return (
        <View>
            <View style={styles.container}>
                <Pressable onPress={showDatepicker}>
                    <Text style={[styles.heading, {marginTop: 0}]}>{dateTitle}</Text>
                    {show && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={appDate}
                            mode={mode}
                            is24Hour={true}
                            onChange={onChange}
                            minimumDate={new Date(2024, 8, 28)}
                            maximumDate={new Date(2025, 3, 26)}
                        />
                    )}
                </Pressable>
            </View>
            {loading? (
                <ActivityIndicator size="large" color="0000ff" />
            ) : areDataReady ? (
                <DaySlider itemList={itemList} />
            ) : (
                <Text>No data available.</Text>
            )}
            <Text style={styles.heading}>{diffIndex}</Text>
            {/* {synaxList ? (
                <DaySlider itemList={synaxList} />
                ) : (
                <Text>Loading</Text>
                )} */}
            <Suspense fallback={<ActivityIndicator size="large" color="blue"/>}>
                <DaySlider key={JSON.stringify(synaxList)} itemList={synaxList} />
            </Suspense>
        </View>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    image: {
        minHeight: 500,
        maxHeight: 1000,
        flex: 1,
        width: 300,
        borderRadius: 20,
        justifyContent: 'flex-start'
        /*         overflow: 'hidden', */
    },
    background: {
        /*         overflow: 'hidden', */
        position: 'absolute',
        minHeight: 500,
        maxHeight: 1000,
        flex: 1,
        width: 300,
        padding: 20,
        borderRadius: 20,
        justifyContent: 'flex-start',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    title2: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 1.5,
        textAlign: 'center',
        marginTop: 30,
    },
    container: {
        marginTop:30,
        flex: 1,
        justifyContent:'center',
        alignItems:'center',
        padding: 16,
        backgroundColor: '#25292e',
    },
    heading: {
        fontSize: 25,
        marginBottom: 20,
        marginTop: 30,
        textAlign: 'center',
        color: '#fff',
    },
    heading2: {
        fontSize: 18,
        color: '#ffd33d',
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 10,
    },
    seeMore: {
        color: '#999',
        textAlign: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    item: {
        backgroundColor: '#f5f5f5',
        padding: 10,
        marginVertical: 8,
        borderRadius: 8,
    },
});

export default Orthocal;
