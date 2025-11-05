// marks-course level meapping
const courseLevelMapping = [
    {
        min: 0,
        max: 40,
        level: ["Easy", "Intermediate"]
    },
    {
        min: 41,
        max: 70,
        level: ["Easy", "Intermediate", "Advanced"]
    },
    {
        min: 71,
        max: 100,
        level: ["Intermediate", "Advanced"]
    }
]

export const getCourseLevel = (marks) => {
    for (const level of courseLevelMapping) {
        if (marks >= level.min && marks <= level.max) {
            return level.level;
        }
    }
    return [];
}